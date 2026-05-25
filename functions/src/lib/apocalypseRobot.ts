import { FieldValue } from "firebase-admin/firestore";
import {
  checkCollectiveWinDetailed,
  collectiveWinChronicleMessagePt,
  type WinPlayerSnapshot,
} from "folclore-game-engine";
import { db } from "./db.js";
import { loadPlayers, loadSecrets } from "../helpers.js";
import { finalizeMvpLedgerIfNeeded } from "./endGameScoring.js";
import { grantAldeaoObjectiveIfMoradoresWon } from "./playerPrivateScore.js";

export const APOCALYPSE_ROBOT_CHRONICLE_PT =
  "As criaturas fugiram. Os moradores sumiram. Algo que não veio do rio, do mato ou do sertão desceu sobre Bucaré sem avisar. Não tinha gorro vermelho. Não tinha escama. Não tinha maldição. Tinha circuito. Os robôs tomaram a praça, abduzindo tudo que era carne, folclore ou mistério — e a Bucaré ficou olhando, sem saber o que fazer com raízes que nunca viram isso antes. O cordel não tem estrofe pra apocalipse robô.";

/** Texto da tela cheia antes do fim de jogo (type: apocalipse_robo). */
export const APOCALYPSE_ROBO_INTERSTITIAL_PT =
  "Não foi o lobisomem. Não foi a Iara. Não foi ninguém que o folclore conhece. Os robôs desceram sobre Bucaré, abduzindo criatura e morador sem distinção — o folclore e a cidade, levados juntos pro mesmo lugar desconhecido. A praça ficou vazia. A Bucaré floresceu amarelo sem ter ninguém pra ver. Apocalipse Robô: o único inimigo que o sertão não tinha lenda pra enfrentar.";

export const APOCALYPSE_OBSERVATION_MS = 60_000;

type LivingPlayerRow = {
  id: string;
  isBot?: boolean;
  alive?: boolean;
  eliminated?: boolean;
  expelled?: boolean;
};

/** Humanos ainda na cidade (vivos, não eliminados, não expulsos). */
export function countLivingHumans(players: LivingPlayerRow[]): number {
  return players.filter(
    (p) => !p.isBot && p.alive !== false && !p.eliminated && !p.expelled,
  ).length;
}

export function isApocalypseRobo(players: LivingPlayerRow[]): boolean {
  return countLivingHumans(players) === 0;
}

/**
 * Marca Apocalipse Robô pendente — dia de observação antes do fim.
 * Retorna true se a condição está ativa (já marcada ou recém-marcada).
 */
export async function markApocalypseRoboIfNeeded(
  roomCode: string,
  round: number,
  playersIn?: LivingPlayerRow[],
): Promise<boolean> {
  const roomRef = db.collection("rooms").doc(roomCode);
  const roomSnap = await roomRef.get();
  const room = roomSnap.data() ?? {};
  if (room.soloMode === true) return false;
  if (room.status === "ended") return true;
  if (room.apocalipseRoboDetected === true) return true;

  const players = playersIn ?? (await loadPlayers(roomCode));
  if (!isApocalypseRobo(players)) return false;

  const now = Date.now();
  await roomRef.update({
    apocalipseRoboDetected: true,
    apocalipseRoboPendingDay: true,
    apocalipseRoboAt: now,
    votingOpen: false,
    pendingNightStart: FieldValue.delete(),
    pendingNightRound: FieldValue.delete(),
    pendingVotingFinalize: FieldValue.delete(),
  });
  return true;
}

/**
 * Modo Detetive: sem humanos vivos na mesa (detetive eliminado/expulso, só bots).
 * Encerra com Apocalipse Robô — sem dia de observação intermediário.
 */
export async function endSoloApocalypseRoboGame(roomCode: string, round: number): Promise<boolean> {
  const roomRef = db.collection("rooms").doc(roomCode);
  const roomSnap = await roomRef.get();
  const room = roomSnap.data() ?? {};
  if (room.soloMode !== true) return false;
  if (room.status === "ended") return true;

  const players = await loadPlayers(roomCode);
  if (!isApocalypseRobo(players)) return false;

  const secrets = await loadSecrets(roomCode);
  const revealedRoles: Record<string, string> = {};
  for (const p of players) {
    const r = secrets[p.id]?.role;
    if (r) revealedRoles[p.id] = r;
  }

  const endBatch = db.batch();
  endBatch.update(roomRef, {
    status: "ended",
    phase: "ended",
    winner: "bots",
    votingOpen: false,
    pendingNightStart: false,
    pendingNightRound: FieldValue.delete(),
    apocalipseRoboDetected: true,
    apocalipseRoboPendingDay: false,
    soloGamePendingEnd: false,
    soloGameEnded: true,
    detectiveGhostObservation: false,
    detectivePhase: FieldValue.delete(),
    revealedRoles,
    detectiveGuesses: null,
    detectiveScore: null,
    collectiveEndKind: FieldValue.delete(),
  });

  endBatch.set(roomRef.collection("publicLogEntries").doc(), {
    round,
    type: "apocalipse_robo",
    message: APOCALYPSE_ROBO_INTERSTITIAL_PT,
    timestamp: Date.now(),
    createdAt: FieldValue.serverTimestamp(),
  });

  endBatch.set(roomRef.collection("publicLogEntries").doc(), {
    round,
    type: "chronicle_end",
    message: APOCALYPSE_ROBOT_CHRONICLE_PT,
    timestamp: Date.now(),
    createdAt: FieldValue.serverTimestamp(),
  });

  await endBatch.commit();
  return true;
}

/** Encerra a partida após o dia de observação do Apocalipse Robô. */
export async function completeApocalypseRoboEnd(roomCode: string, round: number): Promise<boolean> {
  const roomRef = db.collection("rooms").doc(roomCode);
  const roomSnap = await roomRef.get();
  const room = roomSnap.data() ?? {};
  if (room.soloMode === true) return false;
  if (room.status === "ended") return true;
  if (!room.apocalipseRoboDetected && !room.apocalipseRoboPendingDay) return false;

  const [players, secrets] = await Promise.all([loadPlayers(roomCode), loadSecrets(roomCode)]);
  if (!isApocalypseRobo(players)) return false;

  const wpCheck: Record<string, WinPlayerSnapshot> = {};
  for (const p of players) {
    const r = secrets[p.id]?.role;
    if (!r) continue;
    wpCheck[p.id] = {
      id: p.id,
      role: r,
      alive: p.alive !== false,
      eliminated: Boolean(p.eliminated),
      expelled: Boolean(p.expelled),
      individualObjectiveMet: Boolean(p.individualObjectiveMet),
      alignment:
        p.alignment === "moradores" || p.alignment === "criaturas" ? p.alignment : null,
    };
  }
  const maxR = Number(room.maxRounds ?? 7);
  const tpc = Number(room.gameTablePlayerCount ?? 0) || players.length;
  const detail = checkCollectiveWinDetailed(
    wpCheck,
    round,
    maxR,
    tpc,
    Number(room.criaturaRemovedCount ?? 0),
  );
  const forcedWinner = detail.winner ?? "bots";

  const isSolo = room.soloMode === true;
  const revealedRoles: Record<string, string> = {};
  if (!isSolo) {
    for (const p of players) {
      const r = secrets[p.id]?.role;
      if (r) revealedRoles[p.id] = r;
    }
  }

  const endBatch = db.batch();
  endBatch.update(roomRef, {
    status: "ended",
    phase: "ended",
    winner: forcedWinner,
    votingOpen: false,
    pendingNightStart: false,
    pendingNightRound: FieldValue.delete(),
    apocalipseRoboPendingDay: false,
    ...(isSolo
      ? {
          detectivePhase: "done",
          detectiveGuesses: null,
          detectiveScore: null,
        }
      : { revealedRoles }),
    ...(detail.reason === "moradores_plaza_tie"
      ? { collectiveEndKind: "moradores_plaza_tie" }
      : { collectiveEndKind: FieldValue.delete() }),
  });

  endBatch.set(roomRef.collection("publicLogEntries").doc(), {
    round,
    type: "apocalipse_robo",
    message: APOCALYPSE_ROBO_INTERSTITIAL_PT,
    timestamp: Date.now(),
    createdAt: FieldValue.serverTimestamp(),
  });

  const endMsg =
    forcedWinner === "bots" ? APOCALYPSE_ROBOT_CHRONICLE_PT : collectiveWinChronicleMessagePt(detail);
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

  if (forcedWinner === "moradores") {
    await grantAldeaoObjectiveIfMoradoresWon(roomCode, round, forcedWinner, players, secrets).catch(
      console.error,
    );
  }
  if (!isSolo) {
    await finalizeMvpLedgerIfNeeded(roomCode).catch(console.error);
  }
  return true;
}

/** @deprecated Use markApocalypseRoboIfNeeded + completeApocalypseRoboEnd */
export async function endGameApocalypseIfNoHumans(
  roomCode: string,
  round: number,
): Promise<boolean> {
  if (await markApocalypseRoboIfNeeded(roomCode, round)) return true;
  return false;
}
