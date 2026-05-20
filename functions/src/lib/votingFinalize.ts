import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getFunctions } from "firebase-admin/functions";
import { db, loadPlayers } from "../helpers.js";
import { finalizeDay } from "./finalize.js";
import { canSubmitExpulsionVote } from "./playerVote.js";

export const VOTING_FINALIZE_MS = 10_000;

export type PendingVotingFinalize = {
  expiresAt: Timestamp;
  round: number;
};

function pendingFromRoom(room: Record<string, unknown>): PendingVotingFinalize | null {
  const raw = room.pendingVotingFinalize;
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  const expiresAt = p.expiresAt as Timestamp | undefined;
  if (!expiresAt) return null;
  return {
    expiresAt,
    round: Number(p.round ?? 0),
  };
}

export function expiresAtMs(pending: PendingVotingFinalize): number {
  if (pending.expiresAt instanceof Timestamp) return pending.expiresAt.toMillis();
  return Number(pending.expiresAt);
}

async function enqueueExpireTask(roomCode: string, round: number): Promise<void> {
  try {
    const queue = getFunctions().taskQueue("expireVotingFinalizeTask");
    await queue.enqueue(
      { roomCode, round },
      { scheduleDelaySeconds: Math.ceil(VOTING_FINALIZE_MS / 1000) },
    );
  } catch (err) {
    console.error("expireVotingFinalizeTask enqueue failed", err);
  }
}

/** Preenche voto nulo para elegíveis que ainda não constam no doc da rodada. */
export async function fillMissingVotesAsNull(roomCode: string, round: number): Promise<number> {
  const roomRef = db.collection("rooms").doc(roomCode);
  const [players, voteSnap] = await Promise.all([
    loadPlayers(roomCode),
    roomRef.collection("votes").doc(String(round)).get(),
  ]);
  const eligible = players.filter((p) => canSubmitExpulsionVote(p));
  const data = voteSnap.data() ?? {};
  const patch: Record<string, unknown> = {};
  for (const p of eligible) {
    if (p.id && !Object.hasOwn(data, p.id)) {
      patch[p.id] = null;
    }
  }
  if (Object.keys(patch).length === 0) return 0;
  patch.updatedAt = FieldValue.serverTimestamp();
  await roomRef.collection("votes").doc(String(round)).set(patch, { merge: true });
  return Object.keys(patch).length;
}

/**
 * Após o prazo do anfitrião: registra ausência como voto nulo e encerra o dia.
 * Idempotente se a votação já foi fechada.
 */
export async function completeVotingFinalize(
  roomCode: string,
  expectedRound?: number,
): Promise<boolean> {
  const roomRef = db.collection("rooms").doc(roomCode);
  const roomSnap = await roomRef.get();
  const room = roomSnap.data() ?? {};
  if (room.status !== "day" || room.votingOpen !== true) {
    if (room.pendingVotingFinalize) {
      await roomRef.update({ pendingVotingFinalize: FieldValue.delete() });
    }
    return false;
  }

  const round = Number(room.votesRound ?? room.round ?? 1);
  if (expectedRound != null && expectedRound !== round) return false;

  const pending = pendingFromRoom(room);
  if (pending && Date.now() < expiresAtMs(pending) - 150) {
    return false;
  }

  await fillMissingVotesAsNull(roomCode, round);
  await roomRef.update({ pendingVotingFinalize: FieldValue.delete() });
  await finalizeDay(roomCode, round);
  return true;
}

/** Anfitrião inicia contagem de 10s — demais jogadores ainda podem votar. */
export async function beginVotingFinalize(roomCode: string): Promise<{ expiresAt: number; round: number }> {
  const roomRef = db.collection("rooms").doc(roomCode);
  const roomSnap = await roomRef.get();
  const room = roomSnap.data() ?? {};
  if (room.status !== "day" || room.votingOpen !== true) {
    throw new Error("Votação não está aberta.");
  }

  const round = Number(room.votesRound ?? room.round ?? 1);
  const existing = pendingFromRoom(room);
  if (existing && existing.round === round && Date.now() < expiresAtMs(existing)) {
    return { expiresAt: expiresAtMs(existing), round };
  }

  const expiresAt = Timestamp.fromMillis(Date.now() + VOTING_FINALIZE_MS);
  const pending: PendingVotingFinalize = { expiresAt, round };

  await roomRef.update({ pendingVotingFinalize: pending });
  await roomRef.collection("publicLogEntries").doc().set({
    round,
    type: "special",
    message:
      "O anfitrião convocou a apuração. Quem ainda não votou tem dez segundos — depois disso, quem faltar fica sem voto.",
    timestamp: Date.now(),
    createdAt: FieldValue.serverTimestamp(),
  });

  await enqueueExpireTask(roomCode, round);
  return { expiresAt: expiresAt.toMillis(), round };
}

export async function clearPendingVotingFinalize(roomCode: string): Promise<void> {
  const roomRef = db.collection("rooms").doc(roomCode);
  const snap = await roomRef.get();
  if (snap.data()?.pendingVotingFinalize) {
    await roomRef.update({ pendingVotingFinalize: FieldValue.delete() });
  }
}
