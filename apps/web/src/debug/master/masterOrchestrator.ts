import { httpsCallable } from "firebase/functions";
import { fn } from "../../firebase.js";
import {
  ensureMasterPlayerAuth,
  readMasterTokenMarker,
  writeMasterTokenMarker,
} from "../../auth/masterPlayerFirebase.js";
import {
  loadMasterPlayerNames,
  loadMasterPlayerTokens,
  saveMasterPlayerName,
  saveMasterPlayerToken,
  saveMasterRoomCode,
} from "./masterDebugStorage.js";
import { randomPlayerId } from "./randomId.js";

const call = <T, R>(name: string) => httpsCallable<T, R>(fn, name);

export type MasterPlayerRow = {
  id: string;
  name: string;
  uid: string;
  alive: boolean;
  eliminated: boolean;
  expelled: boolean;
  isSpokesperson: boolean;
  isBot: boolean;
  role: string | null;
  side: string | null;
  nightSubmitted: boolean;
};

export type MasterRoomSnapshot = {
  room: {
    code: string;
    status: string;
    phase: string;
    round: number;
    currentActorRole: string | null;
    nightPendingRoles: string[];
    nightReadyPlayerIds: string[];
    hostUid: string;
    hostPlayerId: string | null;
    debug: boolean;
  };
  players: MasterPlayerRow[];
};

export async function fetchMasterRoomInfo(roomCode: string): Promise<MasterRoomSnapshot> {
  const c = call<{ roomCode: string }, MasterRoomSnapshot>("debugMasterRoomInfo");
  const { data } = await c({ roomCode: roomCode.toUpperCase().trim() });
  if (!data?.room?.code) throw new Error("Resposta inválida do servidor.");
  return data;
}

async function ensurePlayerSession(
  roomCode: string,
  playerId: string,
  name: string,
  mode: "create" | "rejoin",
): Promise<string> {
  const services = await ensureMasterPlayerAuth(playerId);
  const uid = services.auth.currentUser?.uid ?? "";
  if (!uid) throw new Error("Auth anônima falhou.");

  if (mode === "create") {
    const join = call<
      { roomCode: string; name: string; playerId: string },
      { roomCode: string; playerId: string }
    >("joinRoom");
    const { data } = await join({ roomCode, name, playerId });
    if (data.playerId !== playerId) throw new Error("joinRoom: playerId divergente.");
  } else {
    const rejoin = call<
      { roomCode: string; playerId: string; name: string },
      { ok: boolean }
    >("rejoinDebugPlayer");
    try {
      await rejoin({ roomCode, playerId, name });
    } catch {
      const join = call<
        { roomCode: string; name: string; playerId: string },
        { roomCode: string; playerId: string }
      >("joinRoom");
      await join({ roomCode, name, playerId });
    }
  }

  writeMasterTokenMarker(playerId, uid);
  saveMasterPlayerToken(playerId, uid);
  saveMasterPlayerName(playerId, name);
  return uid;
}

async function addDebugPlayer(
  roomCode: string,
  name: string,
): Promise<string> {
  const playerId = randomPlayerId();
  await ensurePlayerSession(roomCode, playerId, name, "create");
  return playerId;
}

function clampSlotCount(slotCount: number): number {
  return Math.min(12, Math.max(5, slotCount));
}

function normalizeNames(names: string[], count: number): string[] {
  const n = clampSlotCount(count);
  const defaults = Array.from({ length: n }, (_, i) =>
    i === 0 ? "Anfitrião" : `Jogador ${i + 1}`,
  );
  return defaults.map((d, i) => {
    const raw = names[i];
    return typeof raw === "string" && raw.trim() ? raw.trim().slice(0, 40) : d;
  });
}

/** Creates debug room with `count` human players (5–12), optional custom names, auto-starts if lobby. */
export async function createMasterDebugRoom(
  slotCount: number,
  slotNames: string[],
): Promise<{
  roomCode: string;
  players: MasterPlayerRow[];
}> {
  const count = clampSlotCount(slotCount);
  const names = normalizeNames(slotNames, count);
  const slots: Array<{ id: string; name: string }> = names.map((name) => ({
    id: randomPlayerId(),
    name,
  }));

  const host = slots[0]!;
  await ensureMasterPlayerAuth(host.id);
  const create = call<
    { name: string; debug: boolean; playerId: string },
    { roomCode: string; playerId: string }
  >("createRoom");
  const services = await ensureMasterPlayerAuth(host.id);
  const hostUid = services.auth.currentUser?.uid ?? "";
  const { data: created } = await create({
    name: host.name,
    debug: true,
    playerId: host.id,
  });
  const roomCode = String(created?.roomCode ?? "").toUpperCase().trim();
  if (!roomCode) throw new Error("createRoom retornou código vazio.");
  writeMasterTokenMarker(host.id, hostUid);
  saveMasterPlayerToken(host.id, hostUid);
  saveMasterPlayerName(host.id, host.name);

  for (let i = 1; i < slots.length; i++) {
    const slot = slots[i]!;
    await ensurePlayerSession(roomCode, slot.id, slot.name, "create");
  }

  await ensureMasterPlayerAuth(host.id);
  const start = call<{ roomCode: string }, Record<string, unknown>>("startGame");
  await start({ roomCode });

  saveMasterRoomCode(roomCode);
  const snap = await fetchMasterRoomInfo(roomCode);
  return { roomCode, players: snap.players.filter((p) => !p.isBot) };
}

/** Connect + rejoin; fills up to `slotCount` (min 5) with new players if needed. */
export async function connectMasterRoom(
  roomCode: string,
  slotCount: number,
  slotNames: string[],
): Promise<MasterRoomSnapshot> {
  const code = roomCode.toUpperCase().trim();
  const target = clampSlotCount(slotCount);
  const names = normalizeNames(slotNames, target);
  const storedNames = loadMasterPlayerNames();

  let snap = await fetchMasterRoomInfo(code);
  if (!snap.room.debug) {
    throw new Error("Sala não é debug — use Nova sala debug.");
  }

  let humans = snap.players.filter((p) => !p.isBot);

  for (let i = 0; i < humans.length; i++) {
    const p = humans[i]!;
    const displayName = storedNames[p.id] ?? names[i] ?? p.name;
    await ensurePlayerSession(code, p.id, displayName, "rejoin");
  }

  snap = await fetchMasterRoomInfo(code);
  humans = snap.players.filter((p) => !p.isBot);

  if (snap.room.status !== "lobby") {
    saveMasterRoomCode(code);
    return snap;
  }

  let nameIdx = humans.length;
  while (humans.length < target) {
    const label = names[nameIdx] ?? `Jogador ${nameIdx + 1}`;
    await addDebugPlayer(code, label);
    nameIdx += 1;
    snap = await fetchMasterRoomInfo(code);
    humans = snap.players.filter((p) => !p.isBot);
  }

  if (snap.room.status === "lobby" && humans.length >= 5) {
    const hostId = snap.room.hostPlayerId ?? humans[0]?.id;
    if (hostId) {
      await ensureMasterPlayerAuth(hostId);
      const start = call<{ roomCode: string }, Record<string, unknown>>("startGame");
      try {
        await start({ roomCode: code });
        snap = await fetchMasterRoomInfo(code);
      } catch {
        /* host may already have started or round in progress */
      }
    }
  }

  saveMasterRoomCode(code);
  return snap;
}

export async function forceEndNightMaster(roomCode: string, hostPlayerId: string): Promise<void> {
  await ensureMasterPlayerAuth(hostPlayerId);
  const c = call<{ roomCode: string }, { ok: boolean }>("forceEndNight");
  await c({ roomCode: roomCode.toUpperCase().trim() });
}

export async function forceWinMaster(
  roomCode: string,
  hostPlayerId: string,
  winner: "moradores" | "criaturas" | "individual_objectives",
): Promise<void> {
  await ensureMasterPlayerAuth(hostPlayerId);
  const c = call<{ roomCode: string; winner: string }, { ok: boolean }>("debugForceWin");
  await c({ roomCode: roomCode.toUpperCase().trim(), winner });
}
