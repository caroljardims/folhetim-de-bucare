import type { RoomDoc } from "../types.js";

export const APOCALYPSE_OBSERVATION_MS = 60_000;

export function apocalypseAtMs(room: RoomDoc): number {
  const at = room.apocalipseRoboAt;
  if (typeof at === "number" && Number.isFinite(at)) return at;
  if (at && typeof at === "object" && "seconds" in at) {
    const sec = Number((at as { seconds: number }).seconds);
    if (Number.isFinite(sec)) return sec * 1000;
  }
  return Date.now();
}

export function apocalypseObservationRemainingMs(room: RoomDoc, now = Date.now()): number {
  if (!room.apocalipseRoboPendingDay) return 0;
  const elapsed = now - apocalypseAtMs(room);
  return Math.max(0, APOCALYPSE_OBSERVATION_MS - elapsed);
}

export function isApocalypseObservationDay(room: RoomDoc): boolean {
  return room.status === "day" && room.apocalipseRoboPendingDay === true;
}

export function apocalypseInterstitialMessage(publicLog: Array<{ type?: string; message?: string }>): string | null {
  const entry = [...publicLog].reverse().find((e) => e.type === "apocalipse_robo");
  return entry?.message?.trim() || null;
}

export function apocalypseInterstitialStorageKey(roomCode: string): string {
  return `apocalypse-interstitial-shown:${roomCode.toUpperCase()}`;
}
