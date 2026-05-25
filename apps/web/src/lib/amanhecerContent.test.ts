import { describe, expect, it } from "vitest";
import { buildRoundFolhetim } from "./amanhecerContent.js";
import type { PublicLogEntry } from "../types.js";

describe("buildRoundFolhetim", () => {
  it("não duplica fofocas da madrugada na seção da praça", () => {
    const gossipMuriel =
      "QUEM VIU, JUROU — Uma testemunha anônima viu Muriel próximo ao Lanchonete antes do sol nascer.";
    const gossipDorinha =
      "QUEM VIU, JUROU — Dorinha foi encontrado(a) acordado(a) mais cedo do que o esperado.";
    const prison =
      "O Delegado ordenou a prisão de Catirina. Motivo: Catirina foi visto rondando a praça depois do toque de recolher..";

    const publicLog: PublicLogEntry[] = [
      { id: "1", round: 1, type: "special", message: prison, timestamp: 1 },
      { id: "2", round: 1, type: "special", message: gossipMuriel, timestamp: 2 },
      { id: "3", round: 1, type: "special", message: gossipDorinha, timestamp: 3 },
    ];

    const folhetim = buildRoundFolhetim(publicLog, 1);
    const murielCount = folhetim.paragraphs.filter((p) => p === gossipMuriel).length;
    const dorinhaCount = folhetim.paragraphs.filter((p) => p === gossipDorinha).length;

    expect(murielCount).toBe(1);
    expect(dorinhaCount).toBe(1);
    expect(folhetim.paragraphs).toContain(prison);
  });

  it("não duplica mensagem de empate folclore intacto", () => {
    const tie =
      "Os números se igualaram — mas o folclore ainda está intacto. Bucaré não pode descansar ainda. A noite volta.";
    const death =
      "A cidade acorda com uma ausência. Dona Chica foi encontrado(a) sem vida. Era Cartomante.";

    const publicLog: PublicLogEntry[] = [
      { id: "1", round: 2, type: "death", message: death },
      { id: "2", round: 2, type: "special", message: tie },
    ];

    const folhetim = buildRoundFolhetim(publicLog, 2);
    expect(folhetim.paragraphs.filter((p) => p === tie)).toHaveLength(1);
    expect(folhetim.manchete).toBe("UM MORTO NO AÇUDE");
  });
});
