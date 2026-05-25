import { FieldValue } from "firebase-admin/firestore";
import {
  ALL_BUCARE_LOCATIONS,
  isBucareLocation,
  isReconhecimentoSubmission,
  LOCATION_LABEL_PT,
  locationsWithActiveInhabitants,
  pickReconhecimentoClue,
  RECONHECIMENTO_SPECIAL_ACTION,
  resolveDetectiveLocationVisit,
  type BucareLocation,
  type LocationVisitResultKind,
  type NightActionInput,
  type RoleId,
} from "folclore-game-engine";
import { db, loadPlayers, loadSecrets } from "../helpers.js";
import { appendEvidence } from "./detectiveEvidence/append.js";
import { appendLocationEvidence } from "./detectiveEvidence/location.js";
import type { EvidenceEntry, LocationHistoryEntry } from "./detectiveTypes.js";

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

/** Noite 1 Modo História: ronda por todos os locais com habitantes ativos. */
export async function applyReconnaissanceNight(
  roomCode: string,
  round: number,
  humanPlayerId: string,
  nightActions: Record<string, NightActionInput | undefined>,
): Promise<void> {
  const roomRef = db.collection("rooms").doc(roomCode);
  const [players, secrets] = await Promise.all([loadPlayers(roomCode), loadSecrets(roomCode)]);
  const { rolesInGame } = livingRolesAndMaps(players, secrets);
  const locs = locationsWithActiveInhabitants(rolesInGame);

  const detAction = nightActions[humanPlayerId];
  if (!detAction || detAction.action !== "visit_location") {
    await roomRef.collection("nightActions").doc(String(round)).set(
      {
        [humanPlayerId]: {
          role: "detetive",
          action: "visit_location",
          targetId: null,
          specialAction: RECONHECIMENTO_SPECIAL_ACTION,
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    nightActions[humanPlayerId] = {
      role: "detetive",
      action: "visit_location",
      targetId: null,
      specialAction: RECONHECIMENTO_SPECIAL_ACTION,
    };
  }

  const now = Date.now();
  for (const location of locs) {
    const description = pickReconhecimentoClue(location);
    await appendEvidence(roomCode, humanPlayerId, {
      round,
      type: "reconhecimento_noturno",
      targetId: null,
      weight: "leve",
      description,
      location,
    }).catch(console.error);
  }

  const privRef = roomRef.collection("privateLog").doc(humanPlayerId).collection("entries").doc();
  await privRef.set({
    round,
    message:
      "Você rondou Bucaré inteira antes de investigar. Cada canto da cidade deixou uma impressão — sons, cheiros, sombras. Nada conclusivo, mas o mapa começa a tomar forma.",
    timestamp: now,
    createdAt: FieldValue.serverTimestamp(),
  });
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

  if (room.soloModeDifficulty === "story" && round === 1) {
    await applyReconnaissanceNight(roomCode, round, human.id, nightActions);
    return;
  }

  let location: BucareLocation | null = null;
  const detAction = nightActions[human.id];
  if (
    detAction?.action === "visit_location" &&
    detAction.specialAction &&
    isBucareLocation(detAction.specialAction)
  ) {
    location = detAction.specialAction;
  } else if (
    detAction?.action === "visit_location" &&
    isReconhecimentoSubmission(detAction.specialAction)
  ) {
    return;
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

export function formatReconhecimentoForChronicle(
  evidenceLog: EvidenceEntry[] | undefined,
): string[] {
  const recon = (evidenceLog ?? []).filter((e) => e.type === "reconhecimento_noturno" && e.round === 1);
  if (recon.length === 0) return [];
  const lines = [`Noite 1 — Reconhecimento: ${recon.length} locais visitados`];
  for (const e of recon) {
    const loc =
      e.location && e.location in LOCATION_LABEL_PT
        ? LOCATION_LABEL_PT[e.location as BucareLocation]
        : e.location ?? "?";
    const snippet = String(e.description ?? "").slice(0, 120);
    lines.push(`  · ${loc}: ${snippet}${snippet.length >= 120 ? "…" : ""}`);
  }
  return lines;
}

export function formatLocationHistoryForChronicle(
  entries: LocationHistoryEntry[] | undefined,
  evidenceLog?: EvidenceEntry[],
): string[] {
  const recon = formatReconhecimentoForChronicle(evidenceLog);
  const visit = !entries?.length
    ? []
    : [...entries]
        .sort((a, b) => a.round - b.round || a.location.localeCompare(b.location))
        .map(
          (e) =>
            `Rodada ${e.round}: investigou ${LOCATION_LABEL_PT[e.location]} — ${chronicleResultLabel(e.result)}`,
        );
  return [...recon, ...visit];
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
