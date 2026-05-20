import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useFirebaseServices } from "../context/FirebaseServicesContext.js";
import type { PublicLogEntry } from "../types.js";

export function usePublicLog(roomCode: string): PublicLogEntry[] {
  const { db } = useFirebaseServices();
  const [publicLog, setPublicLog] = useState<PublicLogEntry[]>([]);
  useEffect(() => {
    if (!roomCode) {
      setPublicLog([]);
      return;
    }
    const qLog = query(
      collection(db, "rooms", roomCode, "publicLogEntries"),
      orderBy("timestamp", "asc"),
    );
    return onSnapshot(qLog, (snap) =>
      setPublicLog(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
  }, [roomCode]);
  return publicLog;
}
