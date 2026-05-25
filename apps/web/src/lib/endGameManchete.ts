import type { PlayerDoc, RoomDoc } from "../types.js";
import { ROLE_DISPLAY } from "./roleStories.js";

export type EndManchete = {
  manchete: string;
  paragraphs: string[];
};

function moradoresLobisomemVictoryParagraphs(name: string): string[] {
  const n = name.trim() || "Alguém";
  return [
    "Bucaré respirou fundo na manhã em que tudo acabou.",
    `Não foi fácil. Nunca é fácil quando o perigo tem rosto conhecido, quando a fera senta à mesma mesa, bebe da mesma água, cumprimenta os mesmos vizinhos toda manhã. ${n} estava lá desde o início — sorrindo, conversando, existindo entre os moradores como se fosse uma deles. Como se sempre tivesse sido.`,
    "A cidade desconfiou de todo mundo antes de desconfiar da pessoa certa. É assim que o folclore sobrevive — não pela força, mas pela dúvida que planta nos corações de quem deveria estar unido. Enquanto Bucaré apontava dedos pros lados errados, enquanto os votos se dividiam e os dias passavam sem resolução, o Lobisomem dormia tranquilo entre os seus.",
    "Mas Bucaré é teimosa. Sempre foi.",
    "Rodada por rodada, a cidade foi juntando os pedaços. Um olhar fora de hora. Uma palavra que não fechava. Um voto que ia sempre pro mesmo lugar sem razão aparente. A verdade não chegou de uma vez — chegou aos poucos, como cheia de rio, que sobe devagar até que de repente não tem mais como segurar.",
    `Quando a cidade apontou o dedo pra ${n}, não havia mais dúvida. A expulsão foi feita com a seriedade de quem sabe o peso do que está fazendo. E quando a identidade foi revelada — Lobisomem, confirmado, sem mais disfarce — Bucaré ficou em silêncio por um momento longo demais.`,
    "Não foi de surpresa. Foi de alívio.",
    "A praça da Bucarezeira viu tudo, como sempre vê. As raízes guardaram mais uma história — a de uma cidade que olhou pro perigo nos olhos, reconheceu o que era, e não recuou. O folclore voltou pro mato, pro rio, pra escuridão de onde veio.",
    "Por enquanto.",
    "Bucaré pode dormir. Mas a cidade que sobreviveu ao Lobisomem sabe que o sertão guarda mais do que uma criatura. A próxima lua cheia já está chegando — e o folclore tem memória longa.",
  ];
}

const SIDE_OF_ROLE: Record<string, string> = {
  lobisomem: "criatura",
  saci: "criatura",
  mula: "criatura",
  boto: "criatura",
  iara: "criatura",
  curupira: "neutro",
  doutor: "morador",
  mae_de_santo: "morador",
  geni: "morador",
  boitata: "neutro",
  cartomante: "morador",
  delegado: "morador",
  cangaceiro: "morador",
  padre: "morador",
  coronel: "morador",
  aldeao: "morador",
  bras_cubas: "neutro",
};

function playerWithRole(
  players: PlayerDoc[],
  revealed: Record<string, string>,
  roleId: string,
): string | null {
  const p = players.find((pl) => revealed[pl.id ?? ""] === roleId);
  return p?.name ?? null;
}

function firstCreatureName(players: PlayerDoc[], revealed: Record<string, string>): string | null {
  for (const p of players) {
    const role = revealed[p.id ?? ""];
    if (role && SIDE_OF_ROLE[role] === "criatura") return p.name ?? null;
  }
  return null;
}

/** Manchete e corpo da página 1 da edição final. */
export function buildEndManchete(room: RoomDoc, players: PlayerDoc[]): EndManchete {
  const revealed = room.revealedRoles ?? {};
  const moradoresPlazaTie =
    room.winner === "moradores" && room.collectiveEndKind === "moradores_plaza_tie";

  if (room.winner === "bots") {
    return {
      manchete: "APOCALIPSE ROBÔ",
      paragraphs: [
        "As criaturas fugiram. Os moradores sumiram. Algo que não veio do rio, do mato ou do sertão desceu sobre Bucaré sem avisar. Não tinha gorro vermelho. Não tinha escama. Não tinha maldição. Tinha circuito. Os robôs tomaram a praça, abduzindo tudo que era carne, folclore ou mistério — e a Bucaré ficou olhando, sem saber o que fazer com raízes que nunca viram isso antes. O cordel não tem estrofe pra apocalipse robô.",
      ],
    };
  }

  if (moradoresPlazaTie) {
    return {
      manchete: "A PRAÇA DECIDIU",
      paragraphs: [
        "A cidade segurou o fôlego. O folclore e os moradores ficaram frente a frente na praça — iguais em número. No empate, a cidade resistiu. Bucaré pode dormir tranquila.",
      ],
    };
  }

  if (room.winner === "moradores") {
    const wolf = playerWithRole(players, revealed, "lobisomem");
    return {
      manchete: "A VILA VENCEU O FOLCLORE",
      paragraphs: wolf
        ? moradoresLobisomemVictoryParagraphs(wolf)
        : [
            "O folclore recuou para as sombras. Os moradores venceram — e Bucaré pode dormir tranquila.",
          ],
    };
  }

  if (room.winner === "criaturas") {
    const creature = firstCreatureName(players, revealed);
    return {
      manchete: "AS CRIATURAS DOMINARAM BUCARÉ",
      paragraphs: [
        creature
          ? `Quando a fumaça baixou, o folclore tinha mais sombra do que gente na praça. ${creature} e os demais segredos da noite ficaram por cima.`
          : "Quando a fumaça baixou, havia mais sombra do que gente na praça. O folclore engoliu a vila.",
      ],
    };
  }

  const wp = players.find((p) => p.id === room.winner);
  const wpRole = wp ? revealed[wp.id ?? ""] : null;
  const wpName = wp?.name ?? "Alguém";
  const roleLabel = wpRole ? (ROLE_DISPLAY[wpRole] ?? wpRole) : "o destino";
  return {
    manchete: `${wpName.toUpperCase()} VENCEU`,
    paragraphs: [
      `${wpName} (${roleLabel}) cumpriu o que veio buscar nesta edição — e a praça ficará tempo contando essa história.`,
    ],
  };
}
