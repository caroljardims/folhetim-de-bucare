import { FieldValue } from "firebase-admin/firestore";
import { ROLE_SIDE, type RoleId } from "folclore-game-engine";
import { db } from "./db.js";

export function isCriaturaRole(role: RoleId | undefined): boolean {
  if (!role) return false;
  return ROLE_SIDE[role] === "criatura";
}

/** Incrementa contador na sala quando uma criatura sai da partida (eliminação ou expulsão). */
export function criaturaRemovedIncrementPatch(n = 1): Record<string, unknown> {
  if (n <= 0) return {};
  return { criaturaRemovedCount: FieldValue.increment(n) };
}

export async function incrementCriaturaRemovedCount(roomCode: string, n = 1): Promise<void> {
  const patch = criaturaRemovedIncrementPatch(n);
  if (Object.keys(patch).length === 0) return;
  await db.collection("rooms").doc(roomCode).update(patch);
}
