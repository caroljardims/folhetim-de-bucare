import { FieldValue } from "firebase-admin/firestore";
import { db } from "./db.js";
import type { DetectiveScore, DetectiveRank, SoloModeDifficulty } from "./detectiveTypes.js";

const RANK_ORDER: DetectiveRank[] = ["NOVATO", "INVESTIGADOR", "DETETIVE", "LENDA"];

function rankIndex(r: DetectiveRank): number {
  return RANK_ORDER.indexOf(r);
}

export async function updateDetectiveUserStats(
  uid: string,
  opts: { score: DetectiveScore; mode: SoloModeDifficulty },
): Promise<void> {
  const { score, mode } = opts;
  const uref = db.collection("users").doc(uid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(uref);
    const prev = snap.data() ?? {};
    const prevBest = Number(prev.detectiveBestScore ?? 0);
    const prevRank = (prev.detectiveBestRank as DetectiveRank | undefined) ?? "NOVATO";
    const pct = score.total > 0 ? score.correct / score.total : 0;
    const nextBest = Math.max(prevBest, pct);

    const patch: Record<string, unknown> = {
      detectiveGamesPlayed: FieldValue.increment(1),
      detectiveLastMode: mode,
      gamesPlayed: FieldValue.increment(1),
    };

    if (pct > prevBest || (pct === prevBest && rankIndex(score.rank) > rankIndex(prevRank))) {
      patch.detectiveBestScore = nextBest;
      patch.detectiveBestRank = score.rank;
    } else if (pct === prevBest && rankIndex(score.rank) > rankIndex(prevRank)) {
      patch.detectiveBestRank = score.rank;
    }

    if (score.rank === "LENDA") {
      patch.detectiveLegendCount = FieldValue.increment(1);
      if (mode === "investigation") {
        patch.detectiveLegendNoNetCount = FieldValue.increment(1);
      }
    }

    tx.set(uref, patch, { merge: true });
  });
}
