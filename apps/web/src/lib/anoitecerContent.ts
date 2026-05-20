import type { ChatMessage, PlayerDoc, PublicLogEntry } from "../types.js";
import type { AmanhecerFolhetim } from "./amanhecerContent.js";
import { isDelegadoPrisonPublicEntry, isNightPublicSpecialEntry } from "./amanhecerContent.js";

export function filterAnoitecerDayOutcomes(
  publicLog: PublicLogEntry[],
  prevRound: number,
): PublicLogEntry[] {
  return publicLog.filter((e) => {
    if (e.round !== prevRound) return false;
    const t = e.type ?? "";
    if (t === "expulsion") return true;
    return (
      t === "special" &&
      !isNightPublicSpecialEntry(e) &&
      !isDelegadoPrisonPublicEntry(e)
    );
  });
}

function buildArticle(
  dayOutcomes: PublicLogEntry[],
  prevDayVotes: Record<string, string | null>,
  players: PlayerDoc[],
): { manchete: string; paragraphs: string[] } {
  const nameById = new Map(players.map((p) => [p.id ?? "", p.name ?? ""]));

  // Count votes per target
  const tally: Record<string, number> = {};
  let totalCast = 0;
  let nullVotes = 0;
  for (const targetId of Object.values(prevDayVotes)) {
    if (!targetId) { nullVotes++; continue; }
    tally[targetId] = (tally[targetId] ?? 0) + 1;
    totalCast++;
  }
  const totalVoters = Object.keys(prevDayVotes).length;

  // Check for Brás Cubas special win
  const brasEntry = dayOutcomes.find(
    (e) => e.type === "special" && String(e.message ?? "").includes("Tolo"),
  );
  if (brasEntry) {
    return {
      manchete: "ERA O TOLO",
      paragraphs: [String(brasEntry.message ?? "")],
    };
  }

  // Find expulsion entry for roleName
  const expulsionEntry = dayOutcomes.find((e) => e.type === "expulsion");

  // Check for tie
  const tieEntry = dayOutcomes.find(
    (e) =>
      e.type === "expulsion" &&
      (String(e.message ?? "").includes("empate") ||
        String(e.message ?? "").includes("Ninguém foi expulso")),
  );

  if (tieEntry || Object.keys(tally).length === 0) {
    const maxVotes = Math.max(0, ...Object.values(tally));
    const tied = Object.entries(tally)
      .filter(([, v]) => v === maxVotes && maxVotes > 0)
      .map(([id]) => nameById.get(id) ?? id);

    const isNullHeavy = nullVotes > 0 && nullVotes >= totalCast && totalVoters > 0;
    const isExactTie = tied.length >= 2 && maxVotes > 0;

    if (isNullHeavy) {
      return {
        manchete: "A CIDADE HESITOU",
        paragraphs: [
          `Dos ${totalVoters} votos registrados, ${nullVotes} foram nulos. Sem maioria formada, nenhuma expulsão foi executada nesta rodada. Bucaré segue dividida — ou silenciosa, o que em cidade pequena é quase a mesma coisa.`,
        ],
      };
    }

    if (isExactTie) {
      return {
        manchete: "A CIDADE HESITOU",
        paragraphs: [
          `${maxVotes} voto${maxVotes !== 1 ? "s" : ""} de cada lado. Bucaré empatou — e o empate, nesta cidade, significa que ninguém sai. A decisão que a comunidade não tomou hoje será cobrada pela noite.`,
        ],
      };
    }

    return {
      manchete: "A CIDADE HESITOU",
      paragraphs: [
        `Os ${totalVoters > 0 ? totalVoters : ""} votos desta rodada se dividiram sem maioria. Bucaré não chegou a um veredito — ninguém foi expulso. A cidade permanece como estava, e a noite volta a cobrir o que o dia não resolveu.`.replace(/^Os  votos/, "Os votos"),
      ],
    };
  }

  // Normal expulsion
  const sorted = Object.entries(tally).sort(([, a], [, b]) => b - a);
  const expelledId = sorted[0]?.[0];
  const expelledName = expelledId ? (nameById.get(expelledId) ?? "alguém") : "alguém";
  const votesFor = expelledId ? (tally[expelledId] ?? 0) : 0;
  const votesAgainst = totalCast - votesFor;

  const identity = expulsionEntry?.roleName ?? null;
  const identityClause = identity
    ? `, ${expelledName} revelou sua verdadeira natureza: era ${identity}.`
    : ".";
  const identityLine = identity ? `Era ${identity}.` : "";

  const diff = votesFor - votesAgainst;

  let paragraph: string;
  if (votesAgainst === 0 && votesFor > 0) {
    // Unanimous
    paragraph = `Unanimidade em Bucaré: ${votesFor} votos a ${votesAgainst}. ${expelledName} foi expulso(a) sem resistência da opinião pública. ${identityLine} Raramente a cidade fala com uma só voz — desta vez, falou.`;
  } else if (diff >= 3) {
    // Landslide
    paragraph = `Não houve dúvida desta vez. Com ${votesFor} votos contra ${votesAgainst}, Bucaré expulsou ${expelledName}. ${identityLine} A cidade segue sua noite.`;
  } else if (diff === 1) {
    // Narrow
    paragraph = `Por margem estreita — ${votesFor} votos a ${votesAgainst} — Bucaré decidiu pela saída de ${expelledName}. A decisão dividiu a cidade. ${identityLine} Se a escolha foi acertada, só as próximas horas dirão.`;
  } else {
    // Default
    paragraph = `Por ${votesFor} votos a ${votesAgainst}, a cidade de Bucaré decidiu pela expulsão de ${expelledName}. Retirado(a) das ruas sob os olhares da comunidade${identityClause} O que Bucaré fará com essa informação é, por ora, assunto dos que ficaram.`;
  }

  return {
    manchete: "A CIDADE VOTOU",
    paragraphs: [paragraph],
  };
}

const QUOTE_VERBS: Array<(name: string, text: string) => string> = [
  (name, text) => `"${text}", disse ${name}.`,
  (name, text) => `${name} comentou: "${text}"`,
  (name, text) => `"${text}", afirmou ${name}.`,
  (name, text) => `${name} reagiu: "${text}"`,
  (name, text) => `"${text}" — ${name}`,
];

function pickChatQuotes(chat: ChatMessage[], count: number): string[] {
  const eligible = chat.filter(
    (m) => m.type !== "vote" && String(m.text ?? "").trim().length > 5,
  );
  // One quote per player
  const seenNames = new Set<string>();
  const deduped = eligible.filter((m) => {
    const name = String(m.name ?? "");
    if (!name || seenNames.has(name)) return false;
    seenNames.add(name);
    return true;
  });
  const pool = deduped.length > 0 ? deduped : eligible;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, count);
  return picked.map((m, i) => {
    const name = String(m.name ?? "alguém");
    const text = String(m.text ?? "").trim();
    return QUOTE_VERBS[i % QUOTE_VERBS.length]!(name, text);
  });
}

export function buildAnoitecerFolhetim(
  dayOutcomes: PublicLogEntry[],
  chat: ChatMessage[],
  prevDayVotes: Record<string, string | null>,
  players: PlayerDoc[],
): AmanhecerFolhetim {
  const { manchete, paragraphs: articleParagraphs } = buildArticle(
    dayOutcomes,
    prevDayVotes,
    players,
  );
  const quotes = pickChatQuotes(chat, 3);

  return {
    manchete,
    paragraphs: [...articleParagraphs, ...quotes],
    silentNight: false,
  };
}
