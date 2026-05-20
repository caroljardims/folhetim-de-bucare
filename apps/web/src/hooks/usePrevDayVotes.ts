import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebase.js";
import type { RoomDoc } from "../types.js";

export function usePrevDayVotes(
  roomCode: string,
  room: RoomDoc | null,
): Record<string, string | null> {
  const [votes, setVotes] = useState<Record<string, string | null>>({});
  useEffect(() => {
    if (!roomCode || !room || room.status !== "night" || (room.round ?? 1) <= 1) {
      setVotes({});
      return;
    }
    const prevRound = String(Number(room.round ?? 1) - 1);
    return onSnapshot(doc(db, "rooms", roomCode, "votes", prevRound), (snap) => {
      const raw = snap.data() as Record<string, unknown> | undefined;
      if (!raw) { setVotes({}); return; }
      const next: Record<string, string | null> = {};
      for (const [k, v] of Object.entries(raw)) {
        if (k === "updatedAt") continue;
        next[k] = v == null ? null : String(v);
      }
      setVotes(next);
    });
  }, [roomCode, room?.status, room?.round]);
  return votes;
}
