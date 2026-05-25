import { LOCATION_LABEL_PT, type BucareLocation, type LocationVisitResultKind } from "folclore-game-engine";
import { appendEvidence } from "./append.js";
import { isStorySoloRoom } from "./index.js";
import type { EvidenceType, EvidenceWeight } from "../detectiveTypes.js";

function evidenceForVisit(
  location: BucareLocation,
  result: LocationVisitResultKind,
): { type: EvidenceType; weight: EvidenceWeight; description: string } | null {
  const label = LOCATION_LABEL_PT[location];
  switch (result) {
    case "all_absent":
      return {
        type: "local_vazio",
        weight: "moderado",
        description: `A ${label} estava vazia esta noite. Quem mora por lá estava atuando nas sombras.`,
      };
    case "all_present":
      return {
        type: "local_presente",
        weight: "leve",
        description: `A ${label} estava ocupada. Seus habitantes passaram a noite lá.`,
      };
    case "mixed":
      return {
        type: "local_misto",
        weight: "forte",
        description: `A ${label} tinha movimento suspeito — nem todos que deveriam estar lá foram encontrados.`,
      };
    default:
      return null;
  }
}

export async function appendLocationEvidence(
  roomCode: string,
  humanPlayerId: string,
  round: number,
  location: BucareLocation,
  result: LocationVisitResultKind,
): Promise<void> {
  const gate = await isStorySoloRoom(roomCode);
  if (!gate.ok || gate.humanPlayerId !== humanPlayerId) return;
  const ev = evidenceForVisit(location, result);
  if (!ev) return;
  await appendEvidence(roomCode, humanPlayerId, {
    round,
    type: ev.type,
    targetId: humanPlayerId,
    weight: ev.weight,
    description: ev.description,
  });
}
