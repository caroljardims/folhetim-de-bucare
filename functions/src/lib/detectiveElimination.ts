import { FieldValue } from "firebase-admin/firestore";
import type { RoleId } from "folclore-game-engine";
import { db, loadPlayers, loadSecrets } from "../helpers.js";

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

/** Marca observação fantasma do detetive (Modo Detetive). Não encerra a partida. */
export async function markDetectiveEliminatedIfNeeded(
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
  if (room.detectiveEliminatedAt != null) return true;

  const [players, secrets] = await Promise.all([
    playersIn ? Promise.resolve(playersIn) : loadPlayers(roomCode),
    loadSecrets(roomCode),
  ]);
  if (!isDetectiveEliminated(players, secrets)) return false;

  const now = Date.now();
  await roomRef.update({
    detectiveEliminatedAt: now,
    detectiveEliminationCause: cause,
    detectiveGhostObservation: true,
    detectiveGhostObservationRound: round,
    detectivePhase: FieldValue.delete(),
    detectiveGuesses: FieldValue.delete(),
    detectiveScore: FieldValue.delete(),
  });
  return true;
}

/** Encerra a janela de observação e abre a fase de acusação (partida pode continuar). */
export async function completeDetectiveGhostObservation(roomCode: string): Promise<boolean> {
  const roomRef = db.collection("rooms").doc(roomCode);
  const roomSnap = await roomRef.get();
  const room = roomSnap.data() ?? {};
  if (room.soloMode !== true) return false;
  if (room.detectiveGhostObservation !== true) return false;

  await roomRef.update({
    detectiveGhostObservation: false,
    detectivePhase: "accusation",
    detectiveGuesses: null,
    detectiveScore: null,
  });
  return true;
}

/** Com detetive eliminado, não há anfitrião humano — avança a noite automaticamente. */
export async function autoStartSoloBotNight(roomCode: string, nextRound: number): Promise<void> {
  const roomRef = db.collection("rooms").doc(roomCode);
  const roomSnap = await roomRef.get();
  const room = roomSnap.data() ?? {};
  if (room.soloMode !== true || room.detectiveEliminatedAt == null) return;
  if (room.status === "ended") return;

  await roomRef.update({
    pendingNightStart: false,
    pendingNightRound: FieldValue.delete(),
  });

  const { startNightSequence } = await import("../helpers.js");
  const { processBotNightActions } = await import("./bots.js");
  const { maybeFinalizeNight } = await import("./finalize.js");

  await startNightSequence(roomCode, nextRound);
  await processBotNightActions(roomCode, nextRound);
  await maybeFinalizeNight(roomCode, nextRound);
}

export async function advanceToNextNightOrAuto(
  roomCode: string,
  round: number,
  _room?: Record<string, unknown>,
): Promise<void> {
  const nextRound = round + 1;
  const roomRef = db.collection("rooms").doc(roomCode);
  const room = (await roomRef.get()).data() ?? {};
  if (room.soloMode === true && room.detectiveEliminatedAt != null) {
    await autoStartSoloBotNight(roomCode, nextRound);
    return;
  }
  await roomRef.update({ pendingNightStart: true, pendingNightRound: nextRound });
}
