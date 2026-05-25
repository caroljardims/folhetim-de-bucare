import { FieldValue } from "firebase-admin/firestore";
import { randomId } from "../../helpers.js";
import { db } from "../db.js";
import type { EvidenceEntry } from "../detectiveTypes.js";

export async function appendEvidence(
  roomCode: string,
  humanPlayerId: string,
  entry: Omit<EvidenceEntry, "id" | "createdAt">,
): Promise<void> {
  const full: EvidenceEntry = {
    ...entry,
    id: randomId(),
    createdAt: Date.now(),
  };
  await db
    .collection("rooms")
    .doc(roomCode)
    .collection("players")
    .doc(humanPlayerId)
    .update({ evidenceLog: FieldValue.arrayUnion(full) });
}
