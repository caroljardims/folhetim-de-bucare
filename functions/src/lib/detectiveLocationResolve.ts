import { FieldValue } from "firebase-admin/firestore";
import {
  ALL_BUCARE_LOCATIONS,
  isBucareLocation,
  LOCATION_LABEL_PT,
  resolveDetectiveLocationVisit,
  type BucareLocation,
  type LocationVisitResultKind,
  type NightActionInput,
  type RoleId,
} from "folclore-game-engine";
import { db, loadPlayers, loadSecrets } from "../helpers.js";
import { appendLocationEvidence } from "./detectiveEvidence/location.js";
import type { LocationHistoryEntry } from "./detectiveTypes.js";

function pickRandomLocation(rng: () => number = Math.random): BucareLocation {
  const i = Math.floor(rng() * ALL_BUCARE_LOCATIONS.length);
  return ALL_BUCARE_LOCATIONS[i]!;
}

function livingRolesAndMaps(
  players: Awaited<ReturnType<typeof loadPlayers>>,
  secrets: Awaited<ReturnType<typeof loadSecrets>>,
) {
  const rolesInGame = new Set<RoleId>();
  const playerIdByRole = new Map<RoleId, string>();
  for (const p of players) {
    if (p.alive === false || p.eliminated || p.expelled) continue;
    const role = secrets[p.id]?.role;
    if (!role) continue;
    rolesInGame.add(role);
    if (!playerIdByRole.has(role)) playerIdByRole.set(role, p.id);
  }
  return { rolesInGame, playerIdByRole };
}

/**
 * Resolve a ronda do Detetive após todas as outras ações noturnas.
 * Grava privateLog, locationHistory e evidências (Modo História).
 */
export async function applyDetectiveLocationInvestigation(
  roomCode: string,
  round: number,
  nightActions: Record<string, NightActionInput | undefined>,
): Promise<void> {
  const roomRef = db.collection("rooms").doc(roomCode);
  const roomSnap = await roomRef.get();
  const room = roomSnap.data() ?? {};
  if (room.soloMode !== true) return;

  const [players, secrets] = await Promise.all([loadPlayers(roomCode), loadSecrets(roomCode)]);
  const human = players.find((p) => !p.isBot && p.alive !== false && !p.eliminated && !p.expelled);
  if (!human || secrets[human.id]?.role !== "detetive") return;

  let location: BucareLocation | null = null;
  const detAction = nightActions[human.id];
  if (detAction?.action === "visit_location" && detAction.specialAction && isBucareLocation(detAction.specialAction)) {
    location = detAction.specialAction;
  } else {
    location = pickRandomLocation();
    await roomRef.collection("nightActions").doc(String(round)).set(
      {
        [human.id]: {
          role: "detetive",
          action: "visit_location",
          targetId: null,
          specialAction: location,
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    nightActions[human.id] = {
      role: "detetive",
      action: "visit_location",
      targetId: null,
      specialAction: location,
    };
  }

  const { rolesInGame, playerIdByRole } = livingRolesAndMaps(players, secrets);
  const resolved = resolveDetectiveLocationVisit({
    location,
    rolesInGame,
    nightActionsByPlayerId: nightActions,
    playerIdByRole,
  });

  const now = Date.now();
  const historyEntry: LocationHistoryEntry = {
    round,
    location: resolved.location,
    result: resolved.result,
  };

  const batch = db.batch();
  const privRef = roomRef.collection("privateLog").doc(human.id).collection("entries").doc();
  batch.set(privRef, {
    round,
    message: resolved.privateMessage,
    timestamp: now,
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.update(roomRef.collection("players").doc(human.id), {
    locationHistory: FieldValue.arrayUnion(historyEntry),
  });
  await batch.commit();

  if (room.soloModeDifficulty === "story" && resolved.inhabitants > 0) {
    await appendLocationEvidence(roomCode, human.id, round, resolved.location, resolved.result).catch(
      console.error,
    );
  }
}

export function formatLocationHistoryForChronicle(
  entries: LocationHistoryEntry[] | undefined,
): string[] {
  if (!entries?.length) return [];
  return [...entries]
    .sort((a, b) => a.round - b.round || a.location.localeCompare(b.location))
    .map(
      (e) =>
        `Rodada ${e.round}: investigou ${LOCATION_LABEL_PT[e.location]} — ${chronicleResultLabel(e.result)}`,
    );
}

function chronicleResultLabel(kind: LocationVisitResultKind): string {
  switch (kind) {
    case "all_present":
      return "habitantes presentes";
    case "all_absent":
      return "lugar vazio";
    case "mixed":
      return "movimento suspeito";
    case "empty":
      return "deserto";
  }
}
