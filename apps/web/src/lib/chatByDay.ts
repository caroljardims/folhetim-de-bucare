import type { ChatMessage } from "../types.js";

export type ChatDayGroup = {
  day: number;
  messages: ChatMessage[];
};

/** Agrupa mensagens do chat pelo `votesRound` (dia de votação / fase do dia). */
export function groupChatByDay(chat: ChatMessage[], fallbackDay: number): ChatDayGroup[] {
  const map = new Map<number, ChatMessage[]>();
  for (const m of chat) {
    const day = typeof m.votesRound === "number" ? m.votesRound : fallbackDay;
    const bucket = map.get(day);
    if (bucket) bucket.push(m);
    else map.set(day, [m]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([day, messages]) => ({ day, messages }));
}
