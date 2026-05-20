import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useFirebaseServices } from "../context/FirebaseServicesContext.js";

export type PlayerPrivateDoc = {
  investigationTargetsUsed?: string[];
  nightSuspicionTargetId?: string | null;
  totalGamePoints?: number;
};

export function useMyPlayerPrivate(roomCode: string, playerId: string | undefined) {
  const { db } = useFirebaseServices();
  const [data, setData] = useState<PlayerPrivateDoc | null>(null);

  useEffect(() => {
    if (!roomCode || !playerId) {
      setData(null);
      return;
    }
    const ref = doc(db, "rooms", roomCode, "playerPrivate", playerId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) setData(null);
        else setData(snap.data() as PlayerPrivateDoc);
      },
      () => setData(null),
    );
    return () => unsub();
  }, [roomCode, playerId, db]);

  return data;
}
