import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canSubmitDetectiveGuesses,
  rankFromCorrectCount,
  scoreDetectiveGuesses,
} from "./detectiveTypes.js";

describe("rankFromCorrectCount", () => {
  it("4 acertos = DETETIVE (não NOVATO)", () => {
    assert.equal(rankFromCorrectCount(4), "DETETIVE");
  });

  it("6 acertos = LENDA", () => {
    assert.equal(rankFromCorrectCount(6), "LENDA");
  });
});

describe("scoreDetectiveGuesses", () => {
  const botIds = ["b1", "b2", "b3", "b4", "b5", "b6"];
  const secrets = {
    b1: { role: "lobisomem" as const },
    b2: { role: "saci" as const },
    b3: { role: "delegado" as const },
    b4: { role: "cartomante" as const },
    b5: { role: "bras_cubas" as const },
    b6: { role: "doutor" as const },
  };

  it("conta só palpites confirmados; unknown não penaliza rank", () => {
    const score = scoreDetectiveGuesses(
      {
        b1: "lobisomem",
        b2: "saci",
        b3: "delegado",
        b4: "cartomante",
        b5: "unknown",
        b6: "unknown",
      },
      secrets,
      botIds,
    );
    assert.equal(score.correct, 4);
    assert.equal(score.rank, "DETETIVE");
  });
});

describe("canSubmitDetectiveGuesses", () => {
  it("permite acusação após fim com partida ended e sem score", () => {
    assert.equal(
      canSubmitDetectiveGuesses({
        soloMode: true,
        status: "ended",
        detectivePhase: "reveal",
        detectiveScore: null,
      }),
      true,
    );
  });

  it("bloqueia quando score já foi calculado", () => {
    assert.equal(
      canSubmitDetectiveGuesses({
        soloMode: true,
        status: "ended",
        detectivePhase: "reveal",
        detectiveScore: { correct: 4, rank: "DETETIVE" },
      }),
      false,
    );
  });
});
