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

/** Encerra com Apocalipse Robô se não restar nenhum humano na cidade. */
export async function endGameApocalypseIfNoHumans(
  roomCode: string,
  round: number,
): Promise<boolean> {
  const roomRef = db.collection("rooms").doc(roomCode);
  const roomSnap = await roomRef.get();
  const room = roomSnap.data() ?? {};
  if (room.status === "ended") return true;

  const [players, secrets] = await Promise.all([loadPlayers(roomCode), loadSecrets(roomCode)]);
  if (countLivingHumans(players) > 0) return false;

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
    ...(isSolo
      ? { detectivePhase: "accusation", detectiveGuesses: null, detectiveScore: null }
      : { revealedRoles }),
    ...(detail.reason === "moradores_plaza_tie"
      ? { collectiveEndKind: "moradores_plaza_tie" }
      : { collectiveEndKind: FieldValue.delete() }),
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
