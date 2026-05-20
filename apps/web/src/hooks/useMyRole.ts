import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useFirebaseServices } from "../context/FirebaseServicesContext.js";

export function useMyRole(roomCode: string, playerId: string): string | null {
  const { db } = useFirebaseServices();
  const [myRole, setMyRole] = useState<string | null>(null);
  useEffect(() => {
    if (!roomCode || !playerId) {
      setMyRole(null);
      return;
    }
    return onSnapshot(doc(db, "rooms", roomCode, "secrets", playerId), (s) => {
      setMyRole(s.exists() ? String((s.data() as { role?: string }).role ?? "") : null);
    });
  }, [roomCode, playerId]);
  return myRole;
}
