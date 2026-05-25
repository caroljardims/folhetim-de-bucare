import type { Timestamp } from "firebase-admin/firestore";
import { ROLE_SIDE, type RoleId } from "folclore-game-engine";

export type SoloModeDifficulty = "story" | "investigation";

export type DetectiveRank = "NOVATO" | "INVESTIGADOR" | "DETETIVE" | "LENDA";

export type EvidenceWeight = "leve" | "moderado" | "forte";

export type EvidenceType =
  | "voto_suspeito"
  | "defesa_sem_acusacao"
  | "silencio_suspeito"
  | "acusacao_errada"
  | "defesa_de_inimigo"
  | "alibi_suspeito"
  | "protecao_recebida"
  | "ataque_falhou"
  | "expulsao_reveladora"
  | "local_vazio"
  | "local_presente"
  | "local_misto"
  | "reconhecimento_noturno";

export type LocationHistoryEntry = {
  round: number;
  location: import("folclore-game-engine").BucareLocation;
  result: import("folclore-game-engine").LocationVisitResultKind;
};

export type EvidenceEntry = {
  id: string;
  round: number;
  type: EvidenceType;
  targetId: string | null;
  description: string;
  weight: EvidenceWeight;
  createdAt: number;
  location?: import("folclore-game-engine").BucareLocation;
};

export type DetectiveScore = {
  correct: number;
  total: number;
  criaturaCorrect: number;
  moradorCorrect: number;
  rank: DetectiveRank;
  calculatedAt: Timestamp | number;
};

export function rankFromCorrectCount(correct: number): DetectiveRank {
  if (correct >= 6) return "LENDA";
  if (correct >= 4) return "DETETIVE";
  if (correct >= 2) return "INVESTIGADOR";
  return "NOVATO";
}

/** Permite registrar palpites finais (inclui fim de partida após eliminação do detetive). */
export function canSubmitDetectiveGuesses(room: Record<string, unknown>): boolean {
  if (room.soloMode !== true) return false;
  if (room.detectiveScore != null) return false;
  if (room.detectivePhase === "accusation") return true;
  if (room.status === "ended") return true;
  return false;
}

export function scoreDetectiveGuesses(
  guesses: Record<string, string>,
  secrets: Record<string, { role: RoleId } | undefined>,
  botIds: string[],
): Omit<DetectiveScore, "calculatedAt"> {
  let correct = 0;
  let criaturaCorrect = 0;
  let moradorCorrect = 0;
  let criaturaTotal = 0;
  let moradorTotal = 0;

  for (const bid of botIds) {
    const actual = secrets[bid]?.role;
    if (!actual || actual === "detetive") continue;
    const side = ROLE_SIDE[actual];
    if (side === "criatura") criaturaTotal++;
    else moradorTotal++;

    const guess = String(guesses[bid] ?? "").trim();
    if (guess && guess !== "unknown" && guess === actual) {
      correct++;
      if (side === "criatura") criaturaCorrect++;
      else moradorCorrect++;
    }
  }

  return {
    correct,
    total: 6,
    criaturaCorrect,
    moradorCorrect,
    rank: rankFromCorrectCount(correct),
  };
}
