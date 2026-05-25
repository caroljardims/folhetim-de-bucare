const LS_PREFIX = "folclore_detective_theories_";

export function readDetectiveTheories(roomCode: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(`${LS_PREFIX}${roomCode}`);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export function writeDetectiveTheory(roomCode: string, botId: string, roleId: string): void {
  const prev = readDetectiveTheories(roomCode);
  localStorage.setItem(`${LS_PREFIX}${roomCode}`, JSON.stringify({ ...prev, [botId]: roleId }));
}

/** Palpites finais a partir do caderno (localStorage); vazio = "unknown". */
export function detectiveGuessesFromTheories(
  roomCode: string,
  botIds: string[],
): Record<string, string> {
  const theories = readDetectiveTheories(roomCode);
  const guesses: Record<string, string> = {};
  for (const id of botIds) {
    guesses[id] = theories[id] ?? "unknown";
  }
  return guesses;
}
