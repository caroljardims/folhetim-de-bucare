import { FieldValue } from "firebase-admin/firestore";
import type { IndividualWinEntry } from "folclore-game-engine";
import {
  individualWinChronicleMessagePt,
  individualWinEndsGame,
  pickRoundIndividualGameEndingWin,
} from "folclore-game-engine";
import { db } from "./db.js";
import { loadPlayers, loadSecrets } from "../helpers.js";
import { finalizeMvpLedgerIfNeeded } from "./endGameScoring.js";
import { grantObjectiveMvp } from "./playerPrivateScore.js";

/** Encerra a partida por vitória individual; retorna true se o jogo terminou. */
export async function tryEndGameIndividual(
  roomCode: string,
  round: number,
  roomData: Record<string, unknown>,
  triggeringWin?: IndividualWinEntry,
): Promise<boolean> {
  const roomRef = db.collection("rooms").doc(roomCode);
  const roomSnap = await roomRef.get();
  const rs = roomSnap.data() ?? {};
  if (rs.status === "ended") return true;

  const merged: Record<string, unknown> = { ...roomData, ...rs };
  const wins = (merged.individualWins as IndividualWinEntry[] | undefined) ?? [];
  const win = triggeringWin ?? pickRoundIndividualGameEndingWin(wins, round);
  if (!win || !individualWinEndsGame(win.type)) return false;

  const [snaps, sec] = await Promise.all([loadPlayers(roomCode), loadSecrets(roomCode)]);
  const winnerPlayer = snaps.find((p) => p.id === win.playerId);
  const playerName = String(winnerPlayer?.name ?? win.playerId);
  const endMsg = individualWinChronicleMessagePt(win, playerName);

  const isSolo = merged.soloMode === true;
  const revealedRoles: Record<string, string> = {};
  for (const p of snaps) {
    const r = sec[p.id]?.role;
    if (r) revealedRoles[p.id] = r;
  }

  const soloPhase = merged.detectivePhase as string | undefined;
  let soloPhaseAfterEnd: string;
  if (merged.detectiveScore != null) {
    soloPhaseAfterEnd = soloPhase === "score" ? "score" : "reveal";
  } else {
    soloPhaseAfterEnd = "reveal";
  }

  const batch = db.batch();
  batch.update(roomRef, {
    status: "ended",
    phase: "ended",
    winner: win.playerId,
    votingOpen: false,
    pendingNightStart: FieldValue.delete(),
    pendingBrasChoice: FieldValue.delete(),
    pendingSaciGorro: FieldValue.delete(),
    ...(isSolo
      ? {
          detectiveGhostObservation: false,
          soloGamePendingEnd: FieldValue.delete(),
          detectivePhase:
            merged.detectiveScore != null ? soloPhaseAfterEnd : FieldValue.delete(),
          revealedRoles,
          ...(merged.detectiveScore != null
            ? {}
            : { detectiveGuesses: null, detectiveScore: null }),
        }
      : { revealedRoles }),
    collectiveEndKind: FieldValue.delete(),
  });
  batch.set(roomRef.collection("publicLogEntries").doc(), {
    round,
    type: "chronicle_end",
    message: endMsg,
    timestamp: Date.now(),
    createdAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  await grantObjectiveMvp(roomCode, win.playerId, round).catch(console.error);
  if (!isSolo) {
    await finalizeMvpLedgerIfNeeded(roomCode).catch(console.error);
  }
  return true;
}
