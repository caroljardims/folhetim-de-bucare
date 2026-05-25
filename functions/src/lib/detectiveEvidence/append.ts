import { FieldValue } from "firebase-admin/firestore";
import { randomId } from "../../helpers.js";
import { db } from "../db.js";
import type { EvidenceEntry } from "../detectiveTypes.js";

export async function appendEvidence(
  roomCode: string,
  humanPlayerId: string,
  entry: Omit<EvidenceEntry, "id" | "createdAt">,
): Promise<void> {
  const playerRef = db
    .collection("rooms")
    .doc(roomCode)
    .collection("players")
    .doc(humanPlayerId);
  const snap = await playerRef.get();
  const existing = (snap.data()?.evidenceLog ?? []) as EvidenceEntry[];
  const isDuplicate = existing.some((e) => {
    if (e.type !== entry.type || e.round !== entry.round) return false;
    if (entry.type === "reconhecimento_noturno" || entry.location) {
      return e.location === entry.location && (e.targetId ?? null) === (entry.targetId ?? null);
    }
    return (e.targetId ?? null) === (entry.targetId ?? null);
  });
  if (isDuplicate) return;

  const full: EvidenceEntry = {
    ...entry,
    id: randomId(),
    createdAt: Date.now(),
  };
  await playerRef.update({ evidenceLog: FieldValue.arrayUnion(full) });
}
