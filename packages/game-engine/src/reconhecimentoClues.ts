import {
  ALL_BUCARE_LOCATIONS,
  LOCATION_LABEL_PT,
  ROLE_LOCATIONS,
  type BucareLocation,
} from "./detectiveLocations.js";
import { NIGHT_ACTION_ORDER } from "./nightOrder.js";
import type { RoleId } from "./types.js";

export const RECONHECIMENTO_SPECIAL_ACTION = "reconhecimento" as const;

export const RECONHECIMENTO_CLUES: Record<BucareLocation, string[]> = {
  fazenda: [
    "Marcas de garras fundas na madeira do celeiro. Um uivo distante, logo abafado pelo vento.",
    "O cheiro de terra revirada e algo selvagem no ar. Os cavalos estavam inquietos.",
    "Uma sombra grande passou pelo portão antes do amanhecer. Rápida demais pra ser gado.",
  ],
  lanchonete: [
    "Risadas abafadas e o cheiro de fumaça de cachimbo vindo de dentro. Ninguém deveria estar acordado a essa hora.",
    "Uma cadeira virada, migalhas no chão, e a sensação de que alguém saiu correndo pouco antes de você chegar.",
    "O som de algo sendo arrastado e uma gargalhada curta, seca. A porta estava entreaberta.",
  ],
  cais: [
    "Água perturbada sem vento. Um chapéu branco flutuando perto das pedras.",
    "O cheiro de rio e algo floral, fora de lugar. Passos molhados na madeira do cais.",
    "Uma sombra no reflexo da água que não correspondia a nada na margem.",
  ],
  rio: [
    "A superfície do rio estava estranhamente calma. Uma melodia baixa, quase inaudível, vindo de baixo d'água.",
    "Círculos na água sem pedra jogada. Um riso suave que desapareceu quando você se aproximou.",
    "Flores vermelhas na margem, fora de época. O rio não estava onde devia estar.",
  ],
  igreja: [
    "Uma luz acesa dentro da igreja, tarde demais pra ser missa. Sombras se movendo no vitral.",
    "O cheiro de vela derretida e algo queimado. Um galope distante que parou de repente.",
    "A porta da sacristia estava destrancada. Dentro, apenas cinzas recentes no chão.",
  ],
  floresta: [
    "Passos indo e vindo no mesmo lugar, como se alguém estivesse rondando em círculos. Mas as pegadas apontavam para trás.",
    "Um assovio estridente que fez os pássaros levantarem voo de madrugada. Depois, silêncio.",
    "Galhos quebrados em altura estranha. O cheiro de terra molhada sem chuva.",
  ],
  posto_de_saude: [
    "A luz do consultório acesa. Uma silhueta inclinada sobre algo na mesa.",
    "O cheiro de álcool e ervas. Uma voz murmurando algo, baixo demais pra entender.",
    "Uma janela aberta e papéis espalhados no chão. Alguém foi embora às pressas.",
  ],
  tenda: [
    "Fumaça saindo pela fenda da lona, roxa demais pra ser incenso comum.",
    "As cartas espalhadas do lado de fora, como se tivessem sido jogadas com pressa.",
    "Uma voz sussurrando nomes dentro da tenda. Quando você parou pra ouvir, parou também.",
  ],
  terreiro: [
    "Velas ainda quentes dispostas em círculo. O cheiro de dendê e flores brancas.",
    "Cantos baixos que cessaram quando você se aproximou. A terra estava pisada de muitas direções.",
    "Uma oferenda fresca na entrada. Penas brancas e algo que não era da cidade.",
  ],
  casa: [
    "Janelas fechadas, mas luz embaixo de uma porta. O cheiro de comida fria e café esquecido.",
    "Uma porta rangendo no vento sem vento. Alguém estava acordado — ou fingindo dormir.",
    "Cortinas se movendo sem brisa. Olhos que desviaram quando você olhou.",
  ],
  cemiterio: [
    "Uma figura sentada num túmulo, completamente imóvel. Quando você piscou, havia sumido.",
    "Flores frescas numa sepultura antiga. Alguém esteve aqui recentemente — e ficou por muito tempo.",
    "O barulho de páginas sendo viradas no silêncio da madrugada. Nenhuma lanterna acesa.",
  ],
};

export const GOSSIP_TEMPLATES: Array<{ text: string; needsLocation?: boolean }> = [
  { text: "{name} foi visto(a) nas bordas da cidade antes do amanhecer." },
  { text: "Moradores relatam ter ouvido {name} andando pelas ruas durante a madrugada." },
  { text: "{name} foi encontrado(a) acordado(a) mais cedo do que o esperado." },
  { text: "Uma testemunha anônima viu {name} próximo ao {location} antes do sol nascer.", needsLocation: true },
  { text: "{name} não estava em casa quando os vizinhos foram verificar." },
  { text: "O cachorro de {name} latiu a noite toda. Ninguém sabe por quê." },
];

/** Manchetes sensacionalistas na frente de cada fofoca do amanhecer (dia 1, modo história). */
export const GOSSIP_HEADLINES = [
  "DIZEM NA PRAÇA —",
  "BOATO QUENTE —",
  "FOFOCA DE BUCARÉ —",
  "SEM CONFIRMAR, MAS —",
  "QUEM VIU, JUROU —",
  "CORRESPONDENTE ANÔNIMO —",
  "A VIZINHANÇA COMENTA —",
  "URGENTE DO SERTÃO —",
  "O CORDEL REGISTRA —",
  "ALGUÉM SUSURROU NA TENDA —",
] as const;

export function pickGossipHeadline(rng: () => number = Math.random): string {
  const pool = GOSSIP_HEADLINES;
  return pool[Math.floor(rng() * pool.length)] ?? pool[0]!;
}

/** Linha do Folhetim gerada em pickGossipEntries (evita duplicar na praça). */
export function isGossipFolhetimMessage(message: string): boolean {
  const m = String(message ?? "").trim();
  return GOSSIP_HEADLINES.some((h) => m.startsWith(h));
}

export function pickReconhecimentoClue(
  location: BucareLocation,
  rng: () => number = Math.random,
): string {
  const pool = RECONHECIMENTO_CLUES[location];
  const i = Math.floor(rng() * pool.length);
  return pool[i] ?? pool[0]!;
}

/** Locais com pelo menos um papel da mesa (exceto detetive). */
export function locationsWithActiveInhabitants(rolesInGame: Set<RoleId>): BucareLocation[] {
  const locs = new Set<BucareLocation>();
  for (const role of rolesInGame) {
    if (role === "detetive") continue;
    locs.add(ROLE_LOCATIONS[role]);
  }
  return ALL_BUCARE_LOCATIONS.filter((loc) => locs.has(loc));
}

/** Papéis que podem habitar um local (catálogo completo, para o guia). */
export function allRolesAtLocation(location: BucareLocation): RoleId[] {
  const out: RoleId[] = [];
  for (const [role, loc] of Object.entries(ROLE_LOCATIONS) as [RoleId, BucareLocation][]) {
    if (role === "detetive") continue;
    if (loc === location) out.push(role);
  }
  return out;
}

export type GossipPickInput = {
  botId: string;
  name: string;
  role: RoleId;
};

export type GossipEntry = {
  message: string;
  botId: string;
};

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** 2–3 entradas de fofoca para o Folhetim do amanhecer (dia 1). */
export function pickGossipEntries(
  bots: GossipPickInput[],
  rolesInGame: Set<RoleId>,
  rng: () => number = Math.random,
): GossipEntry[] {
  const nightActive = new Set(
    NIGHT_ACTION_ORDER.filter((r) => rolesInGame.has(r) && r !== "detetive"),
  );
  const preferred = bots.filter((b) => nightActive.has(b.role));
  const pool = preferred.length >= 2 ? preferred : bots;
  const count = 2 + Math.floor(rng() * 2);
  const pickedBots = shuffle(pool, rng).slice(0, Math.min(count, pool.length));
  const templates = shuffle([...GOSSIP_TEMPLATES], rng);

  const entries: GossipEntry[] = [];
  for (let i = 0; i < pickedBots.length; i++) {
    const bot = pickedBots[i]!;
    let tpl = templates[i % templates.length]!;
    if (tpl.needsLocation) {
      const loc = ROLE_LOCATIONS[bot.role];
      tpl = {
        text: tpl.text.replace("{location}", LOCATION_LABEL_PT[loc]),
      };
    }
    const headline = pickGossipHeadline(rng);
    const message = `${headline} ${tpl.text.replace("{name}", bot.name)}`;
    entries.push({ message, botId: bot.botId });
  }
  return entries;
}

export function isReconhecimentoSubmission(specialAction: string | null | undefined): boolean {
  return String(specialAction ?? "").trim() === RECONHECIMENTO_SPECIAL_ACTION;
}
