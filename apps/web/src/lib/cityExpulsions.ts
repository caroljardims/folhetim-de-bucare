import type { PlayerDoc, PublicLogEntry } from "../types.js";

export type CityExpulsionRow = {
  playerId: string;
  name: string;
  round: number | null;
};

/** Jogadores expulsos por votação (ou acusação formal), com rodada inferida do Folhetim. */
export function listCityExpulsions(
  players: PlayerDoc[],
  publicLog: PublicLogEntry[],
): CityExpulsionRow[] {
  return players
    .filter((p) => Boolean(p.expelled) && p.id)
    .map((p) => {
      const name = String(p.name ?? p.id ?? "?");
      const entry = [...publicLog]
        .filter((e) => {
          const t = e.type ?? "";
          if (t !== "expulsion" && t !== "special") return false;
          const msg = String(e.message ?? "");
          if (msg.includes("empate") || msg.includes("Ninguém foi expulso")) return false;
          if (msg.includes("não parece abatido")) return false;
          if (msg.includes("parente distante")) return false;
          return msg.includes(name);
        })
        .sort((a, b) => (b.round ?? 0) - (a.round ?? 0))[0];
      return {
        playerId: p.id!,
        name,
        round: entry?.round ?? null,
      };
    })
    .sort((a, b) => {
      if (a.round != null && b.round != null && a.round !== b.round) return a.round - b.round;
      if (a.round != null && b.round == null) return -1;
      if (a.round == null && b.round != null) return 1;
      return a.name.localeCompare(b.name, "pt");
    });
}
