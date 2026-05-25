import type { RoomDoc } from "../types.js";

export type SoloEndStep =
  | "city_conclusion"
  | "chronicle"
  | "revelation"
  | "detective_score";

export const SOLO_END_STEPS: SoloEndStep[] = [
  "city_conclusion",
  "chronicle",
  "revelation",
  "detective_score",
];

const SPOILER_STEPS = new Set<SoloEndStep>(["city_conclusion", "chronicle", "revelation"]);

/** @deprecated Use `soloEndDisplayProgress(step, steps).total`. */
export const SOLO_END_DISPLAY_TOTAL = SOLO_END_STEPS.length;

/** Passos antigos → fluxo atual (4 telas, sem acusação final). */
export function normalizeSoloEndStep(raw: string | null, steps: SoloEndStep[]): SoloEndStep | null {
  if (!raw) return null;
  let mapped = raw;
  if (mapped === "accusation") mapped = "city_conclusion";
  if (mapped === "detective_edition") mapped = "detective_score";
  return steps.includes(mapped as SoloEndStep) ? (mapped as SoloEndStep) : null;
}

/** Placar ainda não calculado a partir do caderno. */
export function scorePending(room: RoomDoc): boolean {
  return room.soloMode === true && room.detectiveScore == null;
}

/** @deprecated Use `scorePending`. */
export function accusationPending(room: RoomDoc): boolean {
  return scorePending(room);
}

/** @deprecated Use `scorePending`. */
export function detectiveMustAccuseFirst(room: RoomDoc): boolean {
  return scorePending(room);
}

export function activeSoloEndSteps(_room: RoomDoc): SoloEndStep[] {
  return SOLO_END_STEPS;
}

export function soloEndDisplayProgress(
  step: SoloEndStep,
  steps: SoloEndStep[] = SOLO_END_STEPS,
): { current: number; total: number } {
  const i = steps.indexOf(step);
  return { current: i < 0 ? 1 : i + 1, total: steps.length };
}

/** Bloqueia manchete/crônica/revelação até o placar do caderno ser registrado. */
export function soloEndStepRequiresScoreBefore(step: SoloEndStep, room: RoomDoc): boolean {
  return scorePending(room) && SPOILER_STEPS.has(step);
}

export function initialSoloEndStep(
  _room: RoomDoc,
  steps: SoloEndStep[],
  stored: SoloEndStep | null,
): SoloEndStep {
  const first = steps[0] ?? "city_conclusion";
  const normalized = stored ? normalizeSoloEndStep(stored, steps) : null;
  return normalized ?? first;
}

export function soloEndStepIndex(step: SoloEndStep, steps: SoloEndStep[]): number {
  const i = steps.indexOf(step);
  return i < 0 ? 0 : i;
}

export function nextSoloEndStep(
  step: SoloEndStep,
  steps: SoloEndStep[],
): SoloEndStep | null {
  const i = steps.indexOf(step);
  if (i < 0 || i >= steps.length - 1) return null;
  return steps[i + 1] ?? null;
}

export function prevSoloEndStep(
  step: SoloEndStep,
  steps: SoloEndStep[],
): SoloEndStep | null {
  const i = steps.indexOf(step);
  if (i <= 0) return null;
  return steps[i - 1] ?? null;
}

export function soloEndStorageKey(roomCode: string): string {
  return `soloEndStep_${roomCode}`;
}

export function readSoloEndStep(roomCode: string, steps?: SoloEndStep[]): SoloEndStep | null {
  try {
    const raw = sessionStorage.getItem(soloEndStorageKey(roomCode));
    if (steps) return normalizeSoloEndStep(raw, steps);
    if (
      raw === "city_conclusion" ||
      raw === "chronicle" ||
      raw === "revelation" ||
      raw === "detective_score" ||
      raw === "detective_edition" ||
      raw === "accusation"
    ) {
      if (raw === "detective_edition" || raw === "accusation") return "city_conclusion";
      return raw as SoloEndStep;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function writeSoloEndStep(roomCode: string, step: SoloEndStep): void {
  try {
    sessionStorage.setItem(soloEndStorageKey(roomCode), step);
  } catch {
    /* ignore */
  }
}
