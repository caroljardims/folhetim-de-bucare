import { describe, expect, it } from "vitest";
import { RECONHECIMENTO_SPECIAL_ACTION } from "./reconhecimentoClues.js";
import { validateNightAction } from "./nightValidation.js";
import type { PlayerDawnState } from "./types.js";

const baseDetetive: PlayerDawnState = {
  id: "h1",
  name: "Det",
  role: "detetive",
  side: "neutro",
  alive: true,
  eliminated: false,
  expelled: false,
  blockedNextNight: false,
  silenced: false,
  silencedRounds: 0,
  enchanted: false,
  seduced: false,
  jailed: false,
  protected: false,
  invoked: false,
  doctorLastTargetId: null,
  delegadoLastJailedId: null,
  wolfBiteUsed: false,
  mulaExorcizeUsed: false,
  geniCharmUsed: false,
  catechized: false,
  iaraSeductionBlockedThroughRound: null,
};

describe("validateNightAction detetive reconhecimento", () => {
  it("accepts reconhecimento on round 1 story", () => {
    const v = validateNightAction(
      { round: 1, expectedRole: "detetive", soloModeDifficulty: "story" },
      baseDetetive,
      {
        role: "detetive",
        action: "visit_location",
        targetId: null,
        specialAction: RECONHECIMENTO_SPECIAL_ACTION,
      },
    );
    expect(v.ok).toBe(true);
  });

  it("rejects reconhecimento on round 2", () => {
    const v = validateNightAction(
      { round: 2, expectedRole: "detetive", soloModeDifficulty: "story" },
      baseDetetive,
      {
        role: "detetive",
        action: "visit_location",
        targetId: null,
        specialAction: RECONHECIMENTO_SPECIAL_ACTION,
      },
    );
    expect(v.ok).toBe(false);
  });

  it("rejects invalid location string", () => {
    const v = validateNightAction(
      { round: 2, expectedRole: "detetive", soloModeDifficulty: "story" },
      baseDetetive,
      {
        role: "detetive",
        action: "visit_location",
        targetId: null,
        specialAction: "invalid_place",
      },
    );
    expect(v.ok).toBe(false);
  });
});
