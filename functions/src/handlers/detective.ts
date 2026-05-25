import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import type { RoleId } from "folclore-game-engine";
import { db, loadPlayers, loadSecrets } from "../helpers.js";
import { findPlayer, requireAuth } from "./shared.js";
import {
  canSubmitDetectiveGuesses,
  scoreDetectiveGuesses,
  type DetectiveRank,
  type SoloModeDifficulty,
} from "../lib/detectiveTypes.js";
import { finalizeMvpLedgerIfNeeded } from "../lib/endGameScoring.js";
import { updateDetectiveUserStats } from "../lib/detectiveStats.js";
import {
  completeDetectiveGhostObservation as finishDetectiveGhostObservation,
  triggerDetectiveEndGame,
} from "../lib/detectiveElimination.js";
import { syncSilencioSuspeitoForDay } from "../lib/detectiveEvidence/index.js";

const GUESSABLE_ROLES = new Set<RoleId>([
  "lobisomem", "saci", "mula", "boto", "iara", "geni", "bras_cubas", "cangaceiro",
  "curupira", "doutor", "mae_de_santo", "delegado", "boitata", "cartomante",
  "coronel", "padre", "aldeao",
]);

export const submitDetectiveGuesses = onCall(async (req) => {
  requireAuth(req);
  const code = String(req.data?.roomCode ?? "").toUpperCase().trim();
  if (!code) throw new HttpsError("invalid-argument", "Código inválido.");

  const roomRef = db.collection("rooms").doc(code);
  const roomSnap = await roomRef.get();
  if (!roomSnap.exists) throw new HttpsError("not-found", "Sala não encontrada.");
  const room = roomSnap.data()!;
  if (room.soloMode !== true) throw new HttpsError("failed-precondition", "Não é Modo Detetive.");
  if (!canSubmitDetectiveGuesses(room)) {
    throw new HttpsError("failed-precondition", "Placar já registrado.");
  }

  const players = await loadPlayers(code);
  const me = findPlayer(players, req);
  if (!me || me.isBot) throw new HttpsError("permission-denied", "Apenas o detetive.");

  const botIds = players.filter((p) => Boolean(p.isBot)).map((p) => p.id);
  if (botIds.length !== 6) throw new HttpsError("failed-precondition", "Mesa inválida.");

  const rawGuesses = (req.data?.guesses ?? {}) as Record<string, unknown>;
  const guesses: Record<string, string> = {};
  for (const bid of botIds) {
    const g = String(rawGuesses[bid] ?? "unknown").trim();
    if (g === "unknown" || g === "") {
      guesses[bid] = "unknown";
    } else if (GUESSABLE_ROLES.has(g as RoleId)) {
      guesses[bid] = g;
    } else {
      throw new HttpsError("invalid-argument", `Palpite inválido para ${bid}.`);
    }
  }

  const secrets = await loadSecrets(code);
  const scoreBase = scoreDetectiveGuesses(guesses, secrets, botIds);
  const detectiveScore = {
    ...scoreBase,
    calculatedAt: Timestamp.now(),
  };

  const revealedRoles: Record<string, string> = {};
  for (const p of players) {
    const r = secrets[p.id]?.role;
    if (r) revealedRoles[p.id] = r;
  }

  await roomRef.update({
    detectiveGuesses: guesses,
    detectiveScore,
    revealedRoles,
    detectivePhase: "reveal",
  });

  const uid = String(me.uid ?? "");
  if (uid && !uid.startsWith("bot_")) {
    await updateDetectiveUserStats(uid, {
      score: detectiveScore,
      mode: room.soloModeDifficulty as SoloModeDifficulty,
    }).catch(console.error);
  }

  await finalizeMvpLedgerIfNeeded(code).catch(console.error);

  return { ok: true, detectiveScore };
});

/** Atualiza pistas de silêncio após o chat do dia (Modo História). */
export const syncDetectiveDayEvidence = onCall(async (req) => {
  requireAuth(req);
  const code = String(req.data?.roomCode ?? "").toUpperCase().trim();
  if (!code) throw new HttpsError("invalid-argument", "Código inválido.");

  const roomRef = db.collection("rooms").doc(code);
  const roomSnap = await roomRef.get();
  if (!roomSnap.exists) throw new HttpsError("not-found", "Sala não encontrada.");
  const room = roomSnap.data()!;
  if (room.soloMode !== true) throw new HttpsError("failed-precondition", "Não é Modo Detetive.");

  const players = await loadPlayers(code);
  const me = findPlayer(players, req);
  if (!me || me.isBot) throw new HttpsError("permission-denied", "Apenas o detetive.");

  const dayRound = Number(req.data?.dayRound ?? room.votesRound ?? room.round ?? 1);
  await syncSilencioSuspeitoForDay(code, dayRound);
  return { ok: true };
});

export const triggerDetectiveEndGameCallable = onCall(async (req) => {
  requireAuth(req);
  const code = String(req.data?.roomCode ?? "").toUpperCase().trim();
  if (!code) throw new HttpsError("invalid-argument", "Código inválido.");

  const roomRef = db.collection("rooms").doc(code);
  const roomSnap = await roomRef.get();
  if (!roomSnap.exists) throw new HttpsError("not-found", "Sala não encontrada.");
  const room = roomSnap.data()!;
  if (room.soloMode !== true) throw new HttpsError("failed-precondition", "Não é Modo Detetive.");

  const players = await loadPlayers(code);
  const me = findPlayer(players, req);
  if (!me || me.isBot) throw new HttpsError("permission-denied", "Apenas o detetive.");

  const ok = await triggerDetectiveEndGame(code);
  if (!ok) throw new HttpsError("failed-precondition", "Não foi possível encerrar a investigação.");
  return { ok: true };
});

/** @deprecated Prefer triggerDetectiveEndGameCallable */
export const completeDetectiveGhostObservation = onCall(async (req) => {
  requireAuth(req);
  const code = String(req.data?.roomCode ?? "").toUpperCase().trim();
  if (!code) throw new HttpsError("invalid-argument", "Código inválido.");

  const roomRef = db.collection("rooms").doc(code);
  const roomSnap = await roomRef.get();
  if (!roomSnap.exists) throw new HttpsError("not-found", "Sala não encontrada.");
  const room = roomSnap.data()!;
  if (room.soloMode !== true) throw new HttpsError("failed-precondition", "Não é Modo Detetive.");
  if (room.detectiveGhostObservation !== true) {
    throw new HttpsError("failed-precondition", "Observação não está ativa.");
  }

  const players = await loadPlayers(code);
  const me = findPlayer(players, req);
  if (!me || me.isBot) throw new HttpsError("permission-denied", "Apenas o detetive.");

  const ok = await finishDetectiveGhostObservation(code);
  if (!ok) throw new HttpsError("failed-precondition", "Não foi possível encerrar a observação.");
  return { ok: true };
});

export const completeDetectiveEndFlow = onCall(async (req) => {
  requireAuth(req);
  const code = String(req.data?.roomCode ?? "").toUpperCase().trim();
  if (!code) throw new HttpsError("invalid-argument", "Código inválido.");

  const roomRef = db.collection("rooms").doc(code);
  const roomSnap = await roomRef.get();
  if (!roomSnap.exists) throw new HttpsError("not-found", "Sala não encontrada.");
  const room = roomSnap.data()!;
  if (room.soloMode !== true) throw new HttpsError("failed-precondition", "Não é Modo Detetive.");

  const players = await loadPlayers(code);
  const me = findPlayer(players, req);
  if (!me || me.isBot) throw new HttpsError("permission-denied", "Apenas o detetive.");

  await roomRef.update({ detectivePhase: "done" });
  return { ok: true };
});
