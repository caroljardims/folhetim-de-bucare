import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onTaskDispatched } from "firebase-functions/v2/tasks";
import { beginVotingFinalize, completeVotingFinalize } from "../lib/votingFinalize.js";
import { assertRoomHost, requireAuth } from "./shared.js";

export const requestVotingFinalize = onCall(async (req) => {
  const uid = requireAuth(req);
  const code = String(req.data?.roomCode ?? "").toUpperCase().trim();
  if (!code) throw new HttpsError("invalid-argument", "Código inválido.");

  const { db } = await import("../helpers.js");
  const roomRef = db.collection("rooms").doc(code);
  const roomSnap = await roomRef.get();
  if (!roomSnap.exists) throw new HttpsError("not-found", "Sala não encontrada.");
  const room = roomSnap.data()!;
  const { loadPlayers } = await import("../helpers.js");
  const players = await loadPlayers(code);
  assertRoomHost(room, players, req, "Apenas o anfitrião pode finalizar a votação.");
  if (room.status !== "day") throw new HttpsError("failed-precondition", "Não é fase do dia.");
  if (room.votingOpen !== true) {
    throw new HttpsError("failed-precondition", "A votação já foi encerrada.");
  }

  try {
    const result = await beginVotingFinalize(code);
    return { ok: true, ...result };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Não foi possível iniciar a apuração.";
    throw new HttpsError("failed-precondition", msg);
  }
});

/** Fallback cliente ou task queue quando o prazo de 10s expira. */
export const expireVotingFinalize = onCall(async (req) => {
  requireAuth(req);
  const code = String(req.data?.roomCode ?? "").toUpperCase().trim();
  if (!code) throw new HttpsError("invalid-argument", "Código inválido.");
  const round = req.data?.round != null ? Number(req.data.round) : undefined;
  const ok = await completeVotingFinalize(code, round);
  return { ok };
});

export const expireVotingFinalizeTask = onTaskDispatched(
  {
    retryConfig: { maxAttempts: 3, minBackoffSeconds: 5 },
    rateLimits: { maxConcurrentDispatches: 20 },
  },
  async (req) => {
    const roomCode = String(req.data?.roomCode ?? "").toUpperCase().trim();
    const round = req.data?.round != null ? Number(req.data.round) : undefined;
    if (!roomCode) return;
    await completeVotingFinalize(roomCode, round);
  },
);
