export const DAY_OPENING =
  "A cidade está acordada. Conversem, investiguem, desconfiem. Ao fim, votarão para expulsar alguém.";

/** Prefixo gravado em `publicLogEntries` para o Folhetim da vitória individual do Lobisomem (noite 4). */
export const LOBISOMEM_R4_FOLHETIM_MARKER = "@@lobisomem_survived_r4@@";

const LOBISOMEM_R4_FOLHETIM_PARAGRAPHS = [
  "Quatro luas. Era tudo que a fera precisava.",
  "Na primeira noite, Bucaré ainda dormia com a ingenuidade de quem não sabe que tem um lobo entre os seus. Na segunda, havia um morto e muitas perguntas. Na terceira, a cidade já farejava o perigo — mas farejava no lugar errado, olhava os rostos errados, apontava os dedos errados.",
  "E {name} observava. Esperava. Respirava o mesmo ar dos moradores, sentava na mesma praça, dizia as mesmas palavras de sempre. A fera não precisa rugir pra vencer. Precisa só de paciência — e de uma cidade que confunda barulho com perigo.",
  "Na quarta lua, o objetivo estava cumprido. Bucaré nunca soube que havia perdido antes mesmo de começar a procurar. O Lobisomem não dominou a cidade pela força. Dominou pelo silêncio. Pela espera. Pelo sorriso no rosto certo na hora certa.",
  "{name} ainda está entre vocês. E a quinta lua já está nascendo.",
] as const;

/** Texto completo do Folhetim (com marcador) para `publicLogEntries.message`. */
export function lobisomemObjectiveR4FolhetimMessage(playerName: string): string {
  const name = playerName.trim() || "alguém";
  const body = LOBISOMEM_R4_FOLHETIM_PARAGRAPHS.map((p) => p.replace(/\{name\}/g, name)).join("\n\n");
  return `${LOBISOMEM_R4_FOLHETIM_MARKER}\n${body}`;
}

export function isLobisomemObjectiveR4FolhetimMessage(message: string): boolean {
  return String(message ?? "").trimStart().startsWith(LOBISOMEM_R4_FOLHETIM_MARKER);
}

/** Corpo do Folhetim para exibição (manchete + parágrafos). */
export function parseLobisomemObjectiveR4Folhetim(
  message: string,
): { manchete: string; paragraphs: string[] } | null {
  const raw = String(message ?? "").trim();
  if (!raw.startsWith(LOBISOMEM_R4_FOLHETIM_MARKER)) return null;
  const rest = raw.slice(LOBISOMEM_R4_FOLHETIM_MARKER.length).trim();
  const paragraphs = rest.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length === 0) return null;
  return { manchete: "QUATRO LUAS", paragraphs };
}
