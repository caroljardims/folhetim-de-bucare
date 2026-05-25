import type { RoomDoc } from "../types.js";

export const DETECTIVE_GHOST_OBSERVATION_MS = 60_000;

export type DetectiveEliminationCause = "night" | "vote" | "other";

function timestampMs(
  value: number | { seconds: number; nanoseconds?: number } | null | undefined,
): number | null {
  if (value == null) return null;
  if (typeof value === "number") return value;
  if (typeof value === "object" && "seconds" in value) {
    return Number(value.seconds) * 1000;
  }
  return null;
}

function detectiveEliminatedAtMs(room: RoomDoc): number | null {
  return timestampMs(room.detectiveEliminatedAt);
}

function soloGameEndDeadlineMs(room: RoomDoc): number | null {
  return timestampMs(room.soloGameEndDeadline);
}

export function isSoloGamePendingEnd(room: RoomDoc): boolean {
  return (
    room.soloMode === true &&
    room.soloGamePendingEnd === true &&
    room.soloGameEnded !== true &&
    room.status !== "ended"
  );
}

export function soloGameEndRemainingMs(room: RoomDoc, now = Date.now()): number {
  if (!isDetectiveGhostObservation(room)) return 0;
  const deadline = soloGameEndDeadlineMs(room);
  if (deadline != null) return Math.max(0, deadline - now);
  const start = detectiveEliminatedAtMs(room);
  if (start == null) return DETECTIVE_GHOST_OBSERVATION_MS;
  return Math.max(0, DETECTIVE_GHOST_OBSERVATION_MS - (now - start));
}

/** Detetive eliminado: janela de observação antes do fim da partida. */
export function isDetectiveGhostObservation(room: RoomDoc): boolean {
  if (room.soloMode !== true || room.status === "ended" || room.soloGameEnded === true) {
    return false;
  }
  return room.soloGamePendingEnd === true || room.detectiveGhostObservation === true;
}

/** @deprecated Use soloGameEndRemainingMs */
export function detectiveGhostObservationRemainingMs(room: RoomDoc, now = Date.now()): number {
  return soloGameEndRemainingMs(room, now);
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
