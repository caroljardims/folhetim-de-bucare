import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useFirebaseServices } from "../context/FirebaseServicesContext.js";
import type { ChatMessage } from "../types.js";

export function useChat(roomCode: string, dayActive: boolean): ChatMessage[] {
  const { db } = useFirebaseServices();
  const [chat, setChat] = useState<ChatMessage[]>([]);
  useEffect(() => {
    if (!roomCode || !dayActive) {
      setChat([]);
      return;
    }
    const q = query(
      collection(db, "rooms", roomCode, "chat"),
      orderBy("createdAt", "asc"),
    );
    return onSnapshot(q, (snap) =>
      setChat(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
  }, [roomCode, dayActive]);
  return chat;
}
