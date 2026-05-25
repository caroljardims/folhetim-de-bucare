import type { WinPlayerSnapshot } from "folclore-game-engine";
import { loadPlayers, loadSecrets } from "../helpers.js";

type LoadedPlayer = Awaited<ReturnType<typeof loadPlayers>>[number];
type SecretsMap = Awaited<ReturnType<typeof loadSecrets>>;

export function buildWinPlayerSnapshots(
  players: LoadedPlayer[],
  secrets: SecretsMap,
): Record<string, WinPlayerSnapshot> {
  const winPlayers: Record<string, WinPlayerSnapshot> = {};
  for (const p of players) {
    const r = secrets[p.id]?.role;
    if (!r) continue;
    winPlayers[p.id] = {
      id: p.id,
      role: r,
      alive: p.alive !== false,
      eliminated: Boolean(p.eliminated),
      expelled: Boolean(p.expelled),
      individualObjectiveMet: Boolean(p.individualObjectiveMet),
      alignment: p.alignment === "moradores" || p.alignment === "criaturas" ? p.alignment : null,
    };
  }
  return winPlayers;
}
