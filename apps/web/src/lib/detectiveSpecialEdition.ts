import type { RoomDoc } from "../types.js";

/** Manchete do relatório final conforme desfecho da partida. */
export function detectiveSpecialEditionHeadline(room: RoomDoc): string {
  if (room.detectiveEliminatedAt != null) {
    return "DETETIVE EXPULSO(A) ANTES DO FIM";
  }
  const round = Number(room.round ?? 1);
  const maxRounds = Number(room.maxRounds ?? 7);
  if (room.winner === "moradores") {
    return "A VILA VENCEU O FOLCLORE";
  }
  if (room.winner === "criaturas" && round > maxRounds) {
    return "A LUA CHEIA SELOU O DESTINO DE BUCARÉ";
  }
  if (room.winner === "criaturas") {
    return "O FOLCLORE DOMINOU BUCARÉ";
  }
  if (room.winner === "bots") {
    return "APOCALIPSE ROBÔ";
  }
  return "BUCARÉ ENCERRA ESTA EDIÇÃO";
}

export function detectiveSpecialEditionSummary(detectiveName: string, correct: number, total: number): string {
  return `O Detetive ${detectiveName} encerrou sua investigação identificando ${correct} de ${total} habitantes de Bucaré.`;
}
