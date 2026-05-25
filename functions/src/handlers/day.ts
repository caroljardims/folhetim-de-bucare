import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { db, loadPlayers, loadSecrets } from "../helpers.js";
import { finalizeDay, maybeFinalizeDayIfAllVotesIn, tryEndGameCollective } from "../lib/finalize.js";
import { completeApocalypseRoboEnd } from "../lib/apocalypseRobot.js";
import { clearPendingVotingFinalize } from "../lib/votingFinalize.js";
import { canBeExpulsionVoteTarget, canSubmitExpulsionVote } from "../lib/playerVote.js";
import { assertRoomHost, findPlayer, requireAuth } from "./shared.js";
import { buildBotContext, getBotMessage, normalizePhraseKey } from "../lib/botChat/index.js";
import { parseBotKnowledge } from "../lib/botKnowledge/merge.js";

export const submitVote = onCall(async (req) => {
  requireAuth(req);
  const code = String(req.data?.roomCode ?? "").toUpperCase().trim();
  const targetId = (req.data?.targetId as string | null) ?? null;
  const roomRef = db.collection("rooms").doc(code);
  const roomSnap = await roomRef.get();
  if (!roomSnap.exists) throw new HttpsError("not-found", "Sala não encontrada.");
  const room = roomSnap.data()!;
  if (room.status !== "day") throw new HttpsError("failed-precondition", "Não é fase do dia.");
  if (room.apocalipseRoboPendingDay === true) {
    throw new HttpsError("failed-precondition", "A praça observa o Apocalipse Robô — votação encerrada.");
  }

  const voteRound = Number(room.votesRound ?? room.round ?? 1);
  if (Number(room.voidedDayExpulsionRound) === voteRound) {
    throw new HttpsError(
      "failed-precondition",
      "Os votos de expulsão deste dia não valem — a acusação formal do Coronel já foi usada.",
    );
  }

  const players = await loadPlayers(code);
  const me = findPlayer(players, req);
  if (!me) throw new HttpsError("permission-denied", "Jogador não encontrado.");
  if (!canSubmitExpulsionVote(me)) throw new HttpsError("failed-precondition", "Sem direito a voto.");

  if (targetId) {
    const target = players.find((p) => p.id === targetId);
    if (!target || target.id === me.id || !canBeExpulsionVoteTarget(target)) {
      throw new HttpsError("invalid-argument", "Alvo de voto inválido.");
    }
  }

  const round = Number(room.votesRound ?? room.round ?? 1);
  await roomRef.collection("votes").doc(String(round)).set(
    { [me.id]: targetId, updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );

  await roomRef.collection("chat").add({
    playerId: me.id,
    name: me.name,
    type: "vote",
    text: `${String(me.name)} votou.`,
    votesRound: round,
    createdAt: FieldValue.serverTimestamp(),
  });

  await maybeFinalizeDayIfAllVotesIn(code, round);

  return { ok: true };
});

export const sendChatMessage = onCall(async (req) => {
  requireAuth(req);
  const code = String(req.data?.roomCode ?? "").toUpperCase().trim();
  const text = String(req.data?.text ?? "").slice(0, 500);
  if (!code || !text) throw new HttpsError("invalid-argument", "Mensagem inválida.");

  const roomRef = db.collection("rooms").doc(code);
  const roomSnap = await roomRef.get();
  if (!roomSnap.exists) throw new HttpsError("not-found", "Sala não encontrada.");
  if (roomSnap.data()!.status !== "day") throw new HttpsError("failed-precondition", "Chat só no dia.");

  const players = await loadPlayers(code);
  const me = findPlayer(players, req);
  if (!me) throw new HttpsError("permission-denied", "Fora da sala.");
  if (me.silenced) throw new HttpsError("failed-precondition", "Silenciado.");
  const isDead = me.alive === false || Boolean(me.eliminated) || Boolean(me.expelled);
  if (isDead && !me.invoked) throw new HttpsError("failed-precondition", "Você não pode falar.");

  const voteRoundChat = Number(roomSnap.data()!.votesRound ?? roomSnap.data()!.round ?? 1);
  await roomRef.collection("chat").add({
    playerId: me.id,
    name: me.name,
    text,
    votesRound: voteRoundChat,
    createdAt: FieldValue.serverTimestamp(),
  });

  // Bot reativo: ~35% de chance de um bot responder ao humano
  void (async () => {
    try {
      if (Math.random() > 0.35) return;
      const allPlayers = await loadPlayers(code);
      const secrets = await loadSecrets(code);
      const liveBots = allPlayers.filter(
        (p) => p.isBot && p.alive !== false && !p.eliminated && !p.expelled && !p.silenced,
      );
      if (liveBots.length === 0) return;
      const bot = liveBots[Math.floor(Math.random() * liveBots.length)]!;
      const role = secrets[bot.id]?.role ?? "aldeao";
      const livingRefs = allPlayers
        .filter((p) => p.alive !== false && !p.eliminated && !p.expelled)
        .map((p) => ({
          id: p.id,
          name: String(p.name ?? p.id),
          side: (secrets[p.id]?.side ?? "morador") as "criatura" | "morador" | "neutro",
          isBot: Boolean(p.isBot),
        }));
      let chatHistory: Array<{ playerId: string; name: string; text: string }> = [];
      try {
        const snap = await roomRef.collection("chat").orderBy("createdAt", "desc").limit(30).get();
        chatHistory = snap.docs.map((d) => {
          const x = d.data() as Record<string, unknown>;
          return { playerId: String(x.playerId ?? ""), name: String(x.name ?? ""), text: String(x.text ?? "") };
        }).reverse();
      } catch { /* sem histórico */ }
      const round = Number(roomSnap.data()!.votesRound ?? roomSnap.data()!.round ?? 1);
      const botoId = allPlayers.find((p) => secrets[p.id]?.role === "boto")?.id ?? null;
      const iaraId = allPlayers.find((p) => secrets[p.id]?.role === "iara")?.id ?? null;
      const padreId = allPlayers.find((p) => secrets[p.id]?.role === "padre")?.id ?? null;
      const prow = allPlayers.find((p) => p.id === bot.id);
      const kbRow = parseBotKnowledge(prow?.botKnowledge);
      const ctx = buildBotContext({
        selfPlayerId: bot.id,
        role,
        roundNumber: round,
        messageIndex: 0,
        votesRoundDay: round,
        livingPlayers: livingRefs,
        chatHistory,
        publicLogThisDawn: [],
        botoPlayerId: botoId,
        iaraPlayerId: iaraId,
        padrePlayerId: padreId,
        rng: Math.random,
        neutralAlignment:
          prow?.alignment === "moradores" || prow?.alignment === "criaturas"
            ? prow.alignment
            : null,
        botKnowledge: kbRow,
      });
      const avoidPhrases = new Set(
        chatHistory.map((m) => normalizePhraseKey(m.text)).filter(Boolean),
      );
      const reply = getBotMessage(ctx, Math.random, { avoidPhrases });
      await roomRef.collection("chat").add({
        playerId: bot.id,
        name: bot.name,
        text: reply,
        votesRound: round,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch { /* reação do bot é best-effort */ }
  })();

  return { ok: true };
});

export const advanceDay = onCall(async (req) => {
  const uid = requireAuth(req);
  const code = String(req.data?.roomCode ?? "").toUpperCase().trim();
  if (!code) throw new HttpsError("invalid-argument", "Código inválido.");

  const roomRef = db.collection("rooms").doc(code);
  const roomSnap = await roomRef.get();
  if (!roomSnap.exists) throw new HttpsError("not-found", "Sala não encontrada.");
  const room = roomSnap.data()!;
  if (room.status !== "day") throw new HttpsError("failed-precondition", "Não é fase do dia.");
  if (room.apocalipseRoboPendingDay === true) {
    throw new HttpsError("failed-precondition", "O dia de observação do Apocalipse Robô está em curso.");
  }

  const players = await loadPlayers(code);
  if (room.soloMode === true) {
    const me = findPlayer(players, req);
    if (!me || me.isBot) {
      throw new HttpsError("permission-denied", "Apenas o detetive pode encerrar o dia.");
    }
  } else {
    assertRoomHost(room, players, req, "Apenas o anfitrião pode encerrar o dia.");
  }

  const round = Number(room.votesRound ?? room.round ?? 1);

  if (room.votingOpen !== false) {
    await clearPendingVotingFinalize(code);
    await finalizeDay(code, round);
    return { ok: true };
  }

  // Rescue: votingOpen já foi fechado (batch rodou) mas o pós-processamento falhou —
  // jogo preso com status "day" sem pendingNightStart nem pendingBrasChoice.
  const isStuck =
    !room.pendingNightStart &&
    !room.pendingBrasChoice &&
    !room.pendingSaciGorro;
  if (!isStuck) return { ok: true };

  if (await tryEndGameCollective(code, round, room)) return { ok: true };
  const { advanceToNextNightOrAuto } = await import("../lib/detectiveElimination.js");
  await advanceToNextNightOrAuto(code, round, room);
  return { ok: true };
});

/** Modo Detetive: reavalia se o dia pode fechar (ex.: bots já votaram ao amanhecer). */
export const soloTryCloseDay = onCall(async (req) => {
  requireAuth(req);
  const code = String(req.data?.roomCode ?? "").toUpperCase().trim();
  if (!code) throw new HttpsError("invalid-argument", "Código inválido.");

  const roomRef = db.collection("rooms").doc(code);
  const roomSnap = await roomRef.get();
  if (!roomSnap.exists) throw new HttpsError("not-found", "Sala não encontrada.");
  const room = roomSnap.data()!;
  if (room.soloMode !== true) throw new HttpsError("failed-precondition", "Não é Modo Detetive.");
  if (room.status !== "day") throw new HttpsError("failed-precondition", "Não é fase do dia.");

  const players = await loadPlayers(code);
  const me = findPlayer(players, req);
  if (!me || me.isBot) {
    throw new HttpsError("permission-denied", "Apenas o detetive.");
  }

  const round = Number(room.votesRound ?? room.round ?? 1);
  await maybeFinalizeDayIfAllVotesIn(code, round, { allowSoloBotsOnly: true });
  return { ok: true };
});

export const completeApocalypseRobo = onCall(async (req) => {
  requireAuth(req);
  const code = String(req.data?.roomCode ?? "").toUpperCase().trim();
  if (!code) throw new HttpsError("invalid-argument", "Código inválido.");

  const roomRef = db.collection("rooms").doc(code);
  const roomSnap = await roomRef.get();
  if (!roomSnap.exists) throw new HttpsError("not-found", "Sala não encontrada.");
  const room = roomSnap.data()!;
  if (room.status !== "day") throw new HttpsError("failed-precondition", "Não é fase do dia.");
  if (room.apocalipseRoboPendingDay !== true) {
    throw new HttpsError("failed-precondition", "Apocalipse Robô não está pendente.");
  }

  const players = await loadPlayers(code);
  const me = findPlayer(players, req);
  if (!me) throw new HttpsError("permission-denied", "Fora da sala.");

  const round = Number(room.votesRound ?? room.round ?? 1);
  const ok = await completeApocalypseRoboEnd(code, round);
  if (!ok) throw new HttpsError("failed-precondition", "Apocalipse Robô não pode ser encerrado agora.");
  return { ok: true };
});
