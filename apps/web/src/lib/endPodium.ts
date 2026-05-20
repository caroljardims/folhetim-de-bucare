import type { GameSummaryPlayer } from "../hooks/useGameSummary.js";
import type { PlayerDoc, RoomDoc } from "../types.js";

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

const ZERO_BREAKDOWN = {
  suspicion: 0,
  voteEnemy: 0,
  voteExpelledBonus: 0,
  investigation: 0,
  objective: 0,
  survival: 0,
  brasRoundTease: 0,
};

export function podiumTopThree(players: GameSummaryPlayer[]): GameSummaryPlayer[] {
  return [...players]
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (a.rank !== b.rank) return a.rank - b.rank;
      return a.displayName.localeCompare(b.displayName, "pt");
    })
    .slice(0, 3);
}

function buildFallbackPodiumPlayers(
  players: PlayerDoc[],
  revealed: Record<string, string>,
): GameSummaryPlayer[] {
  const rows = players
    .filter((p): p is PlayerDoc & { id: string } => Boolean(p.id))
    .map((p) => {
      const role = revealed[p.id] ?? "aldeao";
      const survived = p.alive !== false && !p.eliminated && !p.expelled;
      return {
        playerId: p.id,
        uid: String(p.uid ?? ""),
        displayName: String(p.name ?? p.id),
        role,
        side: SIDE_OF_ROLE[role] ?? "morador",
        points: 0,
        rank: 0,
        isBot: Boolean(p.isBot),
        individualObjectiveMet: Boolean(p.individualObjectiveMet),
        collectiveWin: false,
        breakdown: { ...ZERO_BREAKDOWN },
        _survived: survived,
        _objectiveMet: Boolean(p.individualObjectiveMet),
      };
    });

  rows.sort((a, b) => {
    if (Number(b._objectiveMet) !== Number(a._objectiveMet)) {
      return Number(b._objectiveMet) - Number(a._objectiveMet);
    }
    if (Number(b._survived) !== Number(a._survived)) {
      return Number(b._survived) - Number(a._survived);
    }
    return a.displayName.localeCompare(b.displayName, "pt");
  });

  return rows.map((r, i) => {
    const { _survived: _s, _objectiveMet: _o, ...rest } = r;
    void _s;
    void _o;
    return { ...rest, rank: i + 1 };
  });
}

/** Fonte do pódio: gameHistory → snapshot na sala → ordem aproximada pelos jogadores. */
export function resolvePodiumPlayers(
  summaryPlayers: GameSummaryPlayer[] | undefined,
  room: RoomDoc,
  players: PlayerDoc[],
): GameSummaryPlayer[] {
  if (summaryPlayers?.length) return summaryPlayers;
  const snap = room.endPodiumSnapshot;
  if (Array.isArray(snap) && snap.length > 0) {
    return snap as GameSummaryPlayer[];
  }
  return buildFallbackPodiumPlayers(players, room.revealedRoles ?? {});
}

export function hasRealPodiumPoints(players: GameSummaryPlayer[]): boolean {
  return players.some((p) => p.points > 0);
}
