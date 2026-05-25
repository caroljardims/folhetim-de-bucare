import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { ROLE_SIDE, displayRoleName, type RoleId } from "folclore-game-engine";
import { loadPlayers, loadSecrets } from "../../helpers.js";
import { db } from "../db.js";
import { appendEvidence } from "./append.js";

/** Player IDs who sent at least one non-vote chat message in the given day round. */
export function speakerIdsFromChatDocs(
  docs: QueryDocumentSnapshot[],
  dayRound: number,
): Set<string> {
  const spoke = new Set<string>();
  for (const doc of docs) {
    const x = doc.data() as Record<string, unknown>;
    const vrRaw = x.votesRound;
    const votesRound = typeof vrRaw === "number" ? vrRaw : Number(vrRaw ?? NaN);
    if (!Number.isFinite(votesRound) || votesRound !== dayRound) continue;
    if (x.type === "vote") continue;
    const text = String(x.text ?? "").trim();
    if (!text) continue;
    const pid = String(x.playerId ?? "");
    if (pid) spoke.add(pid);
  }
  return spoke;
}

/** Bot IDs that had no non-vote chat message during the given day round. */
export async function botIdsSilentInDayRound(
  roomCode: string,
  dayRound: number,
  candidateBotIds: string[],
): Promise<string[]> {
  if (candidateBotIds.length === 0) return [];
  const roomRef = db.collection("rooms").doc(roomCode);
  const chatSnap = await roomRef.collection("chat").where("votesRound", "==", dayRound).get();
  const spoke = speakerIdsFromChatDocs(chatSnap.docs, dayRound);
  return candidateBotIds.filter((id) => !spoke.has(id));
}

export async function isStorySoloRoom(roomCode: string): Promise<{
  ok: boolean;
  humanPlayerId: string | null;
  difficulty: string | null;
}> {
  const snap = await import("../db.js").then((m) => m.db.collection("rooms").doc(roomCode).get());
  const room = snap.data() ?? {};
  if (room.soloMode !== true || room.soloModeDifficulty !== "story") {
    return { ok: false, humanPlayerId: null, difficulty: null };
  }
  const players = await loadPlayers(roomCode);
  const human = players.find((p) => !p.isBot);
  return {
    ok: true,
    humanPlayerId: human?.id ?? null,
    difficulty: String(room.soloModeDifficulty ?? ""),
  };
}

export async function appendExpulsaoReveladora(
  roomCode: string,
  round: number,
  expelledId: string,
  expelledRole: RoleId,
  defenderIds: string[],
  nameById: Map<string, string>,
): Promise<void> {
  const gate = await isStorySoloRoom(roomCode);
  if (!gate.ok || !gate.humanPlayerId) return;
  const roleLabel = displayRoleName(expelledRole);
  for (const defId of defenderIds) {
    const defName = nameById.get(defId) ?? defId;
    const expName = nameById.get(expelledId) ?? expelledId;
    await appendEvidence(roomCode, gate.humanPlayerId, {
      round,
      type: "expulsao_reveladora",
      targetId: defId,
      weight: "forte",
      description: `${defName} defendeu ${expName}, revelado como ${roleLabel}. Observe os padrões.`,
    });
  }
}

export async function appendVotoSuspeito(
  roomCode: string,
  round: number,
  voterId: string,
  targetId: string,
  targetRole: RoleId,
  nameById: Map<string, string>,
): Promise<void> {
  const gate = await isStorySoloRoom(roomCode);
  if (!gate.ok || !gate.humanPlayerId) return;
  const secrets = await loadSecrets(roomCode);
  const voterRole = secrets[voterId]?.role;
  if (!voterRole) return;
  const voterSide = ROLE_SIDE[voterRole];
  const targetSide = ROLE_SIDE[targetRole];
  if (voterSide !== targetSide) return;
  await appendEvidence(roomCode, gate.humanPlayerId, {
    round,
    type: "voto_suspeito",
    targetId: voterId,
    weight: "moderado",
    description: `${nameById.get(voterId) ?? voterId} votou contra ${nameById.get(targetId) ?? targetId}, que acabou revelado como ${displayRoleName(targetRole)}.`,
  });
}

export async function appendPrivateDawnEvidence(
  roomCode: string,
  round: number,
  humanPlayerId: string,
  privateMessages: string[],
): Promise<void> {
  const gate = await isStorySoloRoom(roomCode);
  if (!gate.ok || gate.humanPlayerId !== humanPlayerId) return;
  for (const msg of privateMessages) {
    const lower = msg.toLowerCase();
    if (lower.includes("velou") || lower.includes("proteg")) {
      await appendEvidence(roomCode, humanPlayerId, {
        round,
        type: "protecao_recebida",
        targetId: humanPlayerId,
        weight: "leve",
        description: "Alguém velou por você esta noite. Um protetor age entre os moradores de Bucaré.",
      });
    }
    if (lower.includes("ameaça") || lower.includes("passou perto") || lower.includes("não chegou")) {
      await appendEvidence(roomCode, humanPlayerId, {
        round,
        type: "ataque_falhou",
        targetId: humanPlayerId,
        weight: "leve",
        description: "Uma ameaça passou perto de você esta noite — e não chegou.",
      });
    }
  }
}

export async function appendSilencioSuspeito(
  roomCode: string,
  round: number,
  silentBotIds: string[],
  victimName: string,
  nameById: Map<string, string>,
): Promise<void> {
  const gate = await isStorySoloRoom(roomCode);
  if (!gate.ok || !gate.humanPlayerId) return;
  for (const bid of silentBotIds) {
    await appendEvidence(roomCode, gate.humanPlayerId, {
      round,
      type: "silencio_suspeito",
      targetId: bid,
      weight: "leve",
      description: `${nameById.get(bid) ?? bid} não disse uma palavra na rodada em que ${victimName} morreu.`,
    });
  }
}
