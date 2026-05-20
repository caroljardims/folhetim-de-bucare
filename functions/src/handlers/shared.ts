import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";

export function requireAuth(req: CallableRequest): string {
  if (!req.auth?.uid) throw new HttpsError("unauthenticated", "Auth obrigatória.");
  return req.auth.uid;
}

export type AnyPlayer = Record<string, unknown> & { id: string; uid: string };

/** Lookup by playerId (localStorage) first, then Firebase Auth uid. */
export function findPlayer(players: AnyPlayer[], req: CallableRequest): AnyPlayer | undefined {
  const pid = String(req.data?.playerId ?? "");
  if (pid) {
    const byId = players.find((p) => p.id === pid && !p.isBot);
    if (byId) return byId;
  }
  const uid = req.auth?.uid;
  if (!uid) return undefined;
  return players.find((p) => p.uid === uid && !p.isBot);
}

/** Anfitrião: `hostUid` (Auth) ou `hostPlayerId` (mesa debug / master panel). */
export function assertRoomHost(
  room: Record<string, unknown>,
  players: AnyPlayer[],
  req: CallableRequest,
  message = "Apenas o anfitrião.",
): void {
  const uid = requireAuth(req);
  const hostUid = String(room.hostUid ?? "");
  const hostPlayerId = String(room.hostPlayerId ?? "");
  const me = findPlayer(players, req);
  if (!me) throw new HttpsError("permission-denied", "Você não está nesta sala.");
  if (hostUid && uid === hostUid) return;
  if (hostPlayerId && me.id === hostPlayerId) return;
  const legacyHost = players.find((p) => p.uid === hostUid && !p.isBot);
  if (legacyHost && me.id === legacyHost.id) return;
  throw new HttpsError("permission-denied", message);
}
