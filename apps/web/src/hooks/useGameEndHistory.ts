import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.js";
import { useFirebaseServices } from "../context/FirebaseServicesContext.js";
import type { RoomDoc } from "../types.js";

type NightActionRow = Record<string, { role?: string; action?: string; targetId?: string | null; specialAction?: string | null }>;

export function useGameEndHistory(
  roomCode: string,
  room: RoomDoc | null,
): {
  allRoundVotes: Record<number, Record<string, string | null>>;
  allRoundBotVoteReasons: Record<number, Record<string, string>>;
  allNightActions: Record<number, NightActionRow>;
  historyLoaded: boolean;
} {
  const { db } = useFirebaseServices();
  const { authReady, user } = useAuth();
  const [allRoundVotes, setAllRoundVotes] = useState<Record<number, Record<string, string | null>>>({});
  const [allRoundBotVoteReasons, setAllRoundBotVoteReasons] = useState<
    Record<number, Record<string, string>>
  >({});
  const [allNightActions, setAllNightActions] = useState<Record<number, NightActionRow>>({});
  const [historyLoaded, setHistoryLoaded] = useState(false);

  useEffect(() => {
    if (room?.status !== "ended" || !roomCode) {
      setAllRoundVotes({});
      setAllRoundBotVoteReasons({});
      setAllNightActions({});
      setHistoryLoaded(false);
      return;
    }
    if (!authReady || !user) {
      setHistoryLoaded(false);
      return;
    }

    const totalRounds = Math.max(1, Number(room.round) || 1);
    let cancelled = false;
    setHistoryLoaded(false);

    const fetchHistory = async () => {
      const votesAcc: Record<number, Record<string, string | null>> = {};
      const reasonsAcc: Record<number, Record<string, string>> = {};
      const actionsAcc: Record<number, NightActionRow> = {};
      try {
        await Promise.all(
          Array.from({ length: totalRounds }, (_, i) => i + 1).map(async (r) => {
            const [vSnap, aSnap] = await Promise.all([
              getDoc(doc(db, "rooms", roomCode, "votes", String(r))),
              getDoc(doc(db, "rooms", roomCode, "nightActions", String(r))),
            ]);
            if (vSnap.exists()) {
              const raw = vSnap.data() as Record<string, unknown>;
              const br = raw.botVoteReasons;
              if (br && typeof br === "object" && !Array.isArray(br)) {
                const cleanB: Record<string, string> = {};
                for (const [bk, bv] of Object.entries(br)) {
                  cleanB[bk] = String(bv);
                }
                if (Object.keys(cleanB).length) reasonsAcc[r] = cleanB;
              }
              const votes: Record<string, string | null> = {};
              for (const [k, v] of Object.entries(raw)) {
                if (k === "updatedAt" || k === "botVoteReasons") continue;
                votes[k] = v == null ? null : String(v);
              }
              votesAcc[r] = votes;
            }
            if (aSnap.exists()) {
              actionsAcc[r] = aSnap.data() as NightActionRow;
            }
          }),
        );
        if (cancelled) return;
        setAllRoundVotes(votesAcc);
        setAllRoundBotVoteReasons(reasonsAcc);
        setAllNightActions(actionsAcc);
      } catch (err) {
        console.error("useGameEndHistory", err);
        if (cancelled) return;
        setAllRoundVotes({});
        setAllRoundBotVoteReasons({});
        setAllNightActions({});
      } finally {
        if (!cancelled) setHistoryLoaded(true);
      }
    };

    void fetchHistory();
    return () => {
      cancelled = true;
    };
  }, [room?.status, room?.round, roomCode, db, authReady, user]);

  return { allRoundVotes, allRoundBotVoteReasons, allNightActions, historyLoaded };
}
