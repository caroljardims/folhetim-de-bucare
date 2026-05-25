import { describe, expect, it } from "vitest";
import {
  activeSoloEndSteps,
  initialSoloEndStep,
  normalizeSoloEndStep,
  scorePending,
  SOLO_END_STEPS,
  soloEndStepRequiresScoreBefore,
} from "./soloEndSequence.js";
import type { RoomDoc } from "../types.js";

const soloPending = { soloMode: true } as RoomDoc;
const soloScored = { soloMode: true, detectiveScore: { correct: 2, rank: "INVESTIGADOR" } } as RoomDoc;

describe("activeSoloEndSteps", () => {
  it("tem 4 passos sem acusação final", () => {
    expect(activeSoloEndSteps(soloPending)).toEqual(SOLO_END_STEPS);
    expect(activeSoloEndSteps(soloPending)).toHaveLength(4);
    expect(activeSoloEndSteps(soloPending)).not.toContain("accusation");
  });
});

describe("normalizeSoloEndStep", () => {
  it("migra accusation e edition para city_conclusion", () => {
    expect(normalizeSoloEndStep("accusation", SOLO_END_STEPS)).toBe("city_conclusion");
    expect(normalizeSoloEndStep("detective_edition", SOLO_END_STEPS)).toBe("detective_score");
  });
});

describe("scorePending", () => {
  it("é true até o placar do caderno ser registrado", () => {
    expect(scorePending(soloPending)).toBe(true);
    expect(scorePending(soloScored)).toBe(false);
  });
});

describe("soloEndStepRequiresScoreBefore", () => {
  it("bloqueia spoilers enquanto o placar não existe", () => {
    expect(soloEndStepRequiresScoreBefore("city_conclusion", soloPending)).toBe(true);
    expect(soloEndStepRequiresScoreBefore("detective_score", soloPending)).toBe(false);
  });
});

describe("initialSoloEndStep", () => {
  it("ignora passo salvo de acusação", () => {
    expect(initialSoloEndStep(soloPending, SOLO_END_STEPS, "accusation")).toBe("city_conclusion");
  });
});
