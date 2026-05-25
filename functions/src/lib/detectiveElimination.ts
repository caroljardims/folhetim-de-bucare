import { FieldValue, Timestamp } from "firebase-admin/firestore";
import {
  checkCollectiveWinDetailed,
  collectiveWinChronicleMessagePt,
  type RoleId,
} from "folclore-game-engine";
import { db, loadPlayers, loadSecrets } from "../helpers.js";
import { buildWinPlayerSnapshots } from "./winSnapshots.js";

export const DETECTIVE_GHOST_OBSERVATION_MS = 60_000;

export const DETECTIVE_DEATH_PUBLIC_LOG_PT = (name: string) =>
  `A cidade acorda com uma ausência. ${name} foi encontrado(a) sem vida. Era o Detetive. Bucaré perdeu seus olhos.`;

export const DETECTIVE_EXPULSION_PUBLIC_LOG_PT = (name: string) =>
  `${name} é expulso(a) da cidade. Era o Detetive. A investigação encerrou antes de Bucaré revelar seus segredos.`;

export const DETECTIVE_ELIMINATED_INTRO_PT = (name: string) =>
  `A investigação de ${name} chegou ao fim antes de Bucaré revelar tudo.`;

export const DETECTIVE_ELIMINATED_NIGHT_BODY_PT = (name: string) =>
  `As criaturas de Bucaré não toleram quem olha demais. ${name} foi silenciado(a) antes de chegar à verdade. O caderno ficou incompleto — mas o que estava escrito ainda vale.`;

export const DETECTIVE_ELIMINATED_VOTE_BODY_PT = (name: string) =>
  `A cidade virou as costas para quem tentava protegê-la. ${name} foi embora com suas suspeitas intactas e suas provas na gaveta. Bucaré nem sempre merece o detetive que tem.`;

export const DETECTIVE_KILLED_PRIVATE_LOG_PT =
  "Sua investigação foi interrompida. Bucaré não perdoa os que sabem demais — nem os que sabem de menos. Observe o que a cidade fará sem você.";

export const DETECTIVE_EXPULSED_PRIVATE_LOG_PT =
  "A cidade te expulsou. Às vezes o folclore não precisa de garras — precisa de votos. Observe o que decidem fazer sem sua presença.";

export type DetectiveEliminationCause = "night" | "vote" | "other";

type PlayerRow = {
  id: string;
  isBot?: boolean;
  eliminated?: boolean;
  expelled?: boolean;
  name?: string;
};

export function findHumanDetective(
  players: PlayerRow[],
  secrets: Record<string, { role?: RoleId } | undefined>,
): PlayerRow | undefined {
  const human = players.find((p) => !p.isBot);
  if (!human) return undefined;
  if (secrets[human.id]?.role !== "detetive") return undefined;
  return human;
}

export function isDetectiveEliminated(
  players: PlayerRow[],
  secrets: Record<string, { role?: RoleId } | undefined>,
): boolean {
  const det = findHumanDetective(players, secrets);
  return det ? Boolean(det.eliminated || det.expelled) : false;
}

function soloGameEndDeadlineMs(room: Record<string, unknown>): number | null {
  const d = room.soloGameEndDeadline;
  if (d == null) return null;
  if (typeof d === "number") return d;
  if (typeof d === "object" && d !== null && "toMillis" in d) {
    return Number((d as { toMillis: () => number }).toMillis());
  }
  if (typeof d === "object" && "seconds" in d) {
    return Number((d as { seconds: number }).seconds) * 1000;
  }
  return null;
}

export function isSoloGamePendingEnd(room: Record<string, unknown>): boolean {
  return room.soloMode === true && room.soloGamePendingEnd === true && room.soloGameEnded !== true;
}

/** Marca janela de observação e bloqueia novas rodadas (Modo Detetive). */
export async function handleDetectiveElimination(
  roomCode: string,
  cause: DetectiveEliminationCause,
  round: number,
  playersIn?: PlayerRow[],
): Promise<boolean> {
  const roomRef = db.collection("rooms").doc(roomCode);
  const roomSnap = await roomRef.get();
  const room = roomSnap.data() ?? {};
  if (room.soloMode !== true) return false;
  if (room.status === "ended") return false;
  if (room.soloGamePendingEnd === true || room.detectiveEliminatedAt != null) return true;

  const [players, secrets] = await Promise.all([
    playersIn ? Promise.resolve(playersIn) : loadPlayers(roomCode),
    loadSecrets(roomCode),
  ]);
  const det = findHumanDetective(players, secrets);
  if (!det || (!det.eliminated && !det.expelled)) return false;

  const now = Date.now();
  const detName = String(det.name ?? "Detetive");
  const deadline = Timestamp.fromMillis(now + DETECTIVE_GHOST_OBSERVATION_MS);

  await roomRef.update({
    detectiveEliminatedAt: now,
    detectiveEliminationCause: cause,
    detectiveEliminationRound: round,
    soloGamePendingEnd: true,
    soloGameEndDeadline: deadline,
    soloGameEnded: false,
    detectiveGhostObservation: true,
    detectiveGhostObservationRound: round,
    pendingNightStart: false,
    pendingNightRound: FieldValue.delete(),
    pendingVotingFinalize: FieldValue.delete(),
    votingOpen: false,
    detectivePhase: FieldValue.delete(),
    detectiveGuesses: FieldValue.delete(),
    detectiveScore: FieldValue.delete(),
  });

  const publicMessage =
    cause === "vote"
      ? DETECTIVE_EXPULSION_PUBLIC_LOG_PT(detName)
      : DETECTIVE_DEATH_PUBLIC_LOG_PT(detName);
  await roomRef.collection("publicLogEntries").add({
    round,
    type: cause === "vote" ? "detective_expelled" : "detective_eliminated",
    message: publicMessage,
    timestamp: now,
    createdAt: FieldValue.serverTimestamp(),
  });

  const privateMessage =
    cause === "vote" ? DETECTIVE_EXPULSED_PRIVATE_LOG_PT : DETECTIVE_KILLED_PRIVATE_LOG_PT;
  await roomRef.collection("privateLog").doc(det.id).collection("entries").add({
    round,
    message: privateMessage,
    timestamp: now,
    createdAt: FieldValue.serverTimestamp(),
  });

  return true;
}

/** @deprecated Alias — use handleDetectiveElimination */
export const markDetectiveEliminatedIfNeeded = handleDetectiveElimination;

async function resolveSoloDetectiveEndWinner(
  roomCode: string,
  round: number,
): Promise<"moradores" | "criaturas" | "bots"> {
  const roomRef = db.collection("rooms").doc(roomCode);
  const roomSnap = await roomRef.get();
  const room = roomSnap.data() ?? {};
  const [snaps, sec] = await Promise.all([loadPlayers(roomCode), loadSecrets(roomCode)]);
  const { countLivingHumans } = await import("./apocalypseRobot.js");
  if (countLivingHumans(snaps) === 0) return "bots";

  const maxR = Number(room.maxRounds ?? 7);
  const winPlayers = buildWinPlayerSnapshots(snaps, sec);
  const tpc = Number(room.gameTablePlayerCount ?? 0) || snaps.length;
  const criaturaRemovedCount = Number(room.criaturaRemovedCount ?? 0);
  const detail = checkCollectiveWinDetailed(
    winPlayers,
    round,
    maxR,
    tpc,
    criaturaRemovedCount,
  );
  if (detail.winner === "moradores" || detail.winner === "criaturas") {
    return detail.winner;
  }
  let criaturas = 0;
  let moradores = 0;
  for (const p of Object.values(winPlayers)) {
    if (!p.alive || p.eliminated || p.expelled) continue;
    const side = sec[p.id]?.side;
    if (side === "criatura") criaturas += 1;
    else if (side === "morador") moradores += 1;
  }
  if (criaturas > moradores) return "criaturas";
  if (moradores > criaturas) return "moradores";
  return tpc >= 7 ? "moradores" : "criaturas";
}

/** Encerra a partida solo após observação (timer ou botão). */
export async function triggerDetectiveEndGame(roomCode: string): Promise<boolean> {
  const roomRef = db.collection("rooms").doc(roomCode);
  const roomSnap = await roomRef.get();
  const room = roomSnap.data() ?? {};
  if (room.soloMode !== true) return false;
  if (room.status === "ended") return true;
  if (room.soloGameEnded === true) return true;
  if (room.detectiveEliminatedAt == null && room.soloGamePendingEnd !== true) return false;

  const round = Number(room.detectiveEliminationRound ?? room.round ?? 1);

  await roomRef.update({
    soloGamePendingEnd: false,
    soloGameEnded: true,
    detectiveGhostObservation: false,
    pendingNightStart: false,
    pendingNightRound: FieldValue.delete(),
    votingOpen: false,
  });

  const snapsEarly = await loadPlayers(roomCode);
  const { countLivingHumans, endSoloApocalypseRoboGame } = await import("./apocalypseRobot.js");
  if (countLivingHumans(snapsEarly) === 0) {
    return endSoloApocalypseRoboGame(roomCode, round);
  }

  const { tryEndGameCollective } = await import("./finalize.js");
  if (await tryEndGameCollective(roomCode, round, room)) {
    return true;
  }

  const winner = await resolveSoloDetectiveEndWinner(roomCode, round);
  const [snaps, sec] = await Promise.all([loadPlayers(roomCode), loadSecrets(roomCode)]);
  const winPlayers = buildWinPlayerSnapshots(snaps, sec);
  const maxR = Number(room.maxRounds ?? 7);
  const tpc = Number(room.gameTablePlayerCount ?? 0) || snaps.length;
  const detail = checkCollectiveWinDetailed(
    winPlayers,
    round,
    maxR,
    tpc,
    Number(room.criaturaRemovedCount ?? 0),
  );
  const endMsg =
    collectiveWinChronicleMessagePt({
      winner,
      reason: detail.reason ?? "creatures_strict_majority",
    }) ??
    (winner === "criaturas"
      ? "Não há mais como resistir. O folclore tomou a cidade. As criaturas venceram."
      : "A cidade respirou. O folclore recuou para as sombras. Os moradores venceram.");

  const revealedRoles: Record<string, string> = {};
  for (const p of snaps) {
    const r = sec[p.id]?.role;
    if (r) revealedRoles[p.id] = r;
  }

  const endBatch = db.batch();
  endBatch.update(roomRef, {
    status: "ended",
    phase: "ended",
    winner,
    votingOpen: false,
    detectiveGhostObservation: false,
    soloGamePendingEnd: false,
    soloGameEnded: true,
    detectivePhase: FieldValue.delete(),
    revealedRoles,
    detectiveGuesses: null,
    detectiveScore: null,
  });
  if (endMsg) {
    endBatch.set(roomRef.collection("publicLogEntries").doc(), {
      round,
      type: "chronicle_end",
      message: endMsg,
      timestamp: Date.now(),
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  await endBatch.commit();
  return true;
}

/** Se o prazo de 60s passou, encerra automaticamente. */
export async function expireSoloGameEndIfNeeded(roomCode: string): Promise<boolean> {
  const roomRef = db.collection("rooms").doc(roomCode);
  const roomSnap = await roomRef.get();
  const room = roomSnap.data() ?? {};
  if (!isSoloGamePendingEnd(room)) return false;
  const deadline = soloGameEndDeadlineMs(room);
  if (deadline == null || Date.now() < deadline) return false;
  return triggerDetectiveEndGame(roomCode);
}

/** @deprecated Use triggerDetectiveEndGame */
export async function completeDetectiveGhostObservation(roomCode: string): Promise<boolean> {
  return triggerDetectiveEndGame(roomCode);
}

/** Com detetive eliminado, não avança rodadas — aguarda fim em 60s. */
export async function advanceToNextNightOrAuto(
  roomCode: string,
  _round: number,
  _room?: Record<string, unknown>,
): Promise<void> {
  const roomRef = db.collection("rooms").doc(roomCode);
  const room = (await roomRef.get()).data() ?? {};
  if (room.status === "ended") return;
  if (isSoloGamePendingEnd(room) || room.detectiveEliminatedAt != null) {
    await expireSoloGameEndIfNeeded(roomCode).catch(console.error);
    return;
  }
  const nextRound = Number(_round) + 1;
  await roomRef.update({ pendingNightStart: true, pendingNightRound: nextRound });
}
