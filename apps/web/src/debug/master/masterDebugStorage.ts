const LS_ROOM = "debug_master_roomCode";
const LS_TOKENS = "debug_master_playerTokens";
const LS_NAMES = "debug_master_playerNames";
const LS_SLOT_NAMES = "debug_master_slotNames";

export function loadMasterRoomCode(): string {
  try {
    return (localStorage.getItem(LS_ROOM) ?? "").toUpperCase().trim();
  } catch {
    return "";
  }
}

export function saveMasterRoomCode(code: string): void {
  try {
    localStorage.setItem(LS_ROOM, code.toUpperCase().trim());
  } catch {
    /* ignore */
  }
}

export function clearMasterRoomCode(): void {
  try {
    localStorage.removeItem(LS_ROOM);
  } catch {
    /* ignore */
  }
}

export function loadMasterPlayerTokens(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LS_TOKENS);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string") out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveMasterPlayerToken(playerId: string, uid: string): void {
  const all = loadMasterPlayerTokens();
  all[playerId] = uid;
  try {
    localStorage.setItem(LS_TOKENS, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export function saveMasterPlayerTokens(tokens: Record<string, string>): void {
  try {
    localStorage.setItem(LS_TOKENS, JSON.stringify(tokens));
  } catch {
    /* ignore */
  }
}

export function loadMasterPlayerNames(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LS_NAMES);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string" && v.trim()) out[k] = v.trim().slice(0, 40);
    }
    return out;
  } catch {
    return {};
  }
}

export function saveMasterPlayerName(playerId: string, name: string): void {
  const all = loadMasterPlayerNames();
  all[playerId] = name.trim().slice(0, 40);
  try {
    localStorage.setItem(LS_NAMES, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export function defaultSlotNames(count: number): string[] {
  const n = Math.min(12, Math.max(5, count));
  return Array.from({ length: n }, (_, i) =>
    i === 0 ? "Anfitrião" : `Jogador ${i + 1}`,
  );
}

export function loadMasterSlotNames(count: number): string[] {
  const n = Math.min(12, Math.max(5, count));
  const defaults = defaultSlotNames(n);
  try {
    const raw = localStorage.getItem(LS_SLOT_NAMES);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return defaults;
    return defaults.map((d, i) => {
      const v = parsed[i];
      return typeof v === "string" && v.trim() ? v.trim().slice(0, 40) : d;
    });
  } catch {
    return defaults;
  }
}

export function saveMasterSlotNames(names: string[]): void {
  try {
    localStorage.setItem(
      LS_SLOT_NAMES,
      JSON.stringify(names.map((n) => n.trim().slice(0, 40))),
    );
  } catch {
    /* ignore */
  }
}
