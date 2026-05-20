import { Timestamp } from "firebase/firestore";
import type { RoomDoc } from "../types.js";

export type PendingVotingFinalize = NonNullable<RoomDoc["pendingVotingFinalize"]>;

export function hasPendingVotingFinalize(room: RoomDoc | null | undefined): boolean {
  return Boolean(room?.pendingVotingFinalize && typeof room.pendingVotingFinalize === "object");
}

export function expiresAtMs(
  expiresAt: PendingVotingFinalize["expiresAt"] | undefined,
): number {
  if (!expiresAt) return Date.now();
  if (expiresAt instanceof Timestamp) return expiresAt.toMillis();
  if (typeof expiresAt === "number") return expiresAt;
  if (typeof expiresAt === "object" && "seconds" in expiresAt) {
    return expiresAt.seconds * 1000;
  }
  return Date.now();
}
