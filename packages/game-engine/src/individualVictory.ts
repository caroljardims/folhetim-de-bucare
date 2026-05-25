import type { IndividualWinEntry, RoleId } from "./types.js";

/** Vitórias individuais que encerram a partida na hora (sem fase extra). */
export const INDIVIDUAL_WIN_ENDS_GAME_TYPES = new Set<string>([
  "lobisomem_survived_r4",
  "mula_padre",
  "iara_delegado",
  "cangaceiro_iara",
  "boto_all_moradores",
  "padre_all_moradores",
  "coronel_acusacao_boitata",
]);

const INDIVIDUAL_WIN_CHRONICLE_PT: Record<string, string> = {
  mula_padre: "A maldição encontrou o Padre — vitória da Mula.",
  iara_delegado: "O Delegado foi levado pelas águas — vitória da Iara.",
  lobisomem_survived_r4:
    "Quatro luas. Era tudo que a fera precisava — vitória individual do Lobisomem.",
  boto_all_moradores: "Não sobrou coração de morador sem encanto — vitória do Boto.",
  padre_all_moradores: "A fé cobriu todo morador vivo — vitória do Padre.",
  cangaceiro_iara: "O tiro encontrou a Iara — vitória do Cangaceiro.",
  coronel_acusacao_boitata:
    "A acusação formal acertou o fogo — vitória do Coronel sobre o Boitatá.",
};

export function individualWinEndsGame(type: string): boolean {
  return INDIVIDUAL_WIN_ENDS_GAME_TYPES.has(type);
}

/** Vitória individual desta rodada que deve encerrar a partida (a mais recente). */
export function pickRoundIndividualGameEndingWin(
  wins: IndividualWinEntry[],
  round: number,
): IndividualWinEntry | null {
  const candidates = wins.filter(
    (w) => w.round === round && individualWinEndsGame(w.type),
  );
  if (candidates.length === 0) return null;
  return candidates.reduce((latest, w) =>
    w.timestamp >= latest.timestamp ? w : latest,
  );
}

export function individualWinChronicleMessagePt(
  win: IndividualWinEntry,
  playerName: string,
): string {
  const body =
    INDIVIDUAL_WIN_CHRONICLE_PT[win.type] ??
    `Conquista registrada (${win.type}).`;
  const name = playerName.trim() || "Alguém";
  return `${name}, rodada ${win.round}: ${body}`;
}

export type LobisomemR4DawnCheck = {
  round: number;
  wolfPlayerId: string | undefined;
  wolfAlreadyMet: boolean;
  wolfAlive: boolean;
  wolfEliminated: boolean;
  wolfExpelled: boolean;
  existingWinTypes: string[];
  timestamp: number;
};

/** Após o amanhecer da rodada 4: Lobisomem vivo e não expulso. */
export function maybeLobisomemSurvivedR4Win(
  input: LobisomemR4DawnCheck,
): IndividualWinEntry | null {
  if (input.round !== 4) return null;
  if (!input.wolfPlayerId || input.wolfAlreadyMet) return null;
  if (
    input.existingWinTypes.includes("lobisomem_survived_r4") ||
    !input.wolfAlive ||
    input.wolfEliminated ||
    input.wolfExpelled
  ) {
    return null;
  }
  return {
    playerId: input.wolfPlayerId,
    role: "lobisomem" as RoleId,
    type: "lobisomem_survived_r4",
    round: input.round,
    timestamp: input.timestamp,
  };
}
