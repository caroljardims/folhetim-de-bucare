import type { RoomDoc } from "../types.js";

export const DETECTIVE_GHOST_OBSERVATION_MS = 60_000;

export type DetectiveEliminationCause = "night" | "vote" | "other";

function detectiveEliminatedAtMs(room: RoomDoc): number | null {
  const at = room.detectiveEliminatedAt;
  if (at == null) return null;
  if (typeof at === "number") return at;
  if (typeof at === "object" && "seconds" in at) {
    return Number((at as { seconds: number }).seconds) * 1000;
  }
  return null;
}

export function detectiveGhostObservationRemainingMs(room: RoomDoc, now = Date.now()): number {
  if (room.detectiveGhostObservation !== true) return 0;
  const start = detectiveEliminatedAtMs(room);
  if (start == null) return DETECTIVE_GHOST_OBSERVATION_MS;
  return Math.max(0, DETECTIVE_GHOST_OBSERVATION_MS - (now - start));
}

export function isDetectiveGhostObservation(room: RoomDoc): boolean {
  return room.soloMode === true && room.detectiveGhostObservation === true;
}

export function detectiveEliminatedInterstitialStorageKey(roomCode: string): string {
  return `detective_elim_intro_${roomCode}`;
}

export function detectiveEliminatedIntroMessage(
  detectiveName: string,
  cause: DetectiveEliminationCause | undefined,
): { lead: string; body: string } {
  const lead = `A investigação de ${detectiveName} chegou ao fim antes de Bucaré revelar tudo.`;
  const body =
    cause === "vote"
      ? `A cidade virou as costas para quem tentava protegê-la. ${detectiveName} foi embora com suas suspeitas intactas e suas provas na gaveta. Bucaré nem sempre merece o detetive que tem.`
      : `As criaturas de Bucaré não toleram quem olha demais. ${detectiveName} foi silenciado(a) antes de chegar à verdade. O caderno ficou incompleto — mas o que estava escrito ainda vale.`;
  return { lead, body };
}
