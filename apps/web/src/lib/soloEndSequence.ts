import type { RoomDoc } from "../types.js";

export type SoloEndStep =
  | "city_conclusion"
  | "chronicle"
  | "accusation"
  | "revelation"
  | "detective_score";

export const SOLO_END_STEPS: SoloEndStep[] = [
  "city_conclusion",
  "chronicle",
  "accusation",
  "revelation",
  "detective_score",
];

export function shouldSkipAccusation(room: RoomDoc): boolean {
  return room.detectiveEliminatedAt != null;
}

export function activeSoloEndSteps(room: RoomDoc): SoloEndStep[] {
  if (shouldSkipAccusation(room)) {
    return ["city_conclusion", "chronicle", "revelation", "detective_score"];
  }
  return SOLO_END_STEPS;
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

export function readSoloEndStep(roomCode: string): SoloEndStep | null {
  try {
    const raw = sessionStorage.getItem(soloEndStorageKey(roomCode));
    if (
      raw === "city_conclusion" ||
      raw === "chronicle" ||
      raw === "accusation" ||
      raw === "revelation" ||
      raw === "detective_score"
    ) {
      return raw;
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
