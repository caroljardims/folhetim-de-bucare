import { collection, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useFirebaseServices } from "../context/FirebaseServicesContext.js";
import type { PlayerDoc } from "../types.js";

export function usePlayersCollection(roomCode: string): PlayerDoc[] {
  const { db } = useFirebaseServices();
  const [players, setPlayers] = useState<PlayerDoc[]>([]);
  useEffect(() => {
    if (!roomCode) {
      setPlayers([]);
      return;
    }
    return onSnapshot(collection(db, "rooms", roomCode, "players"), (snap) =>
      setPlayers(snap.docs.map((d) => ({ ...d.data(), id: d.id }) as PlayerDoc)),
    );
  }, [roomCode, db]);
  return players;
}
