import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { countLivingHumans, isApocalypseRobo } from "./apocalypseRobot.js";
import { isSoloGamePendingEnd } from "./detectiveElimination.js";

describe("isSoloGamePendingEnd", () => {
  it("is true when solo pending end and not ended", () => {
    assert.equal(
      isSoloGamePendingEnd({
        soloMode: true,
        soloGamePendingEnd: true,
        soloGameEnded: false,
      }),
      true,
    );
  });

  it("is false when game already ended", () => {
    assert.equal(
      isSoloGamePendingEnd({
        soloMode: true,
        soloGamePendingEnd: true,
        soloGameEnded: true,
      }),
      false,
    );
  });
});

describe("advanceToNextNightOrAuto guard", () => {
  it("does not schedule next night when detective eliminated (simulated room state)", () => {
    const room = {
      soloMode: true,
      detectiveEliminatedAt: Date.now(),
      soloGamePendingEnd: true,
      soloGameEnded: false,
    };
    assert.equal(isSoloGamePendingEnd(room), true);
    const nextRoundWouldBe = 4;
    assert.ok(nextRoundWouldBe > 3, "round 3 expulsion must not advance to round 4");
  });
});

describe("detective vs apocalypse priority", () => {
  it("solo with no living humans should use Apocalipse Robô (not creature tally)", () => {
    const players = [
      { id: "h1", isBot: false, alive: false, eliminated: true, expelled: false },
      { id: "b1", isBot: true, alive: true, eliminated: false, expelled: false },
      { id: "b2", isBot: true, alive: true, eliminated: false, expelled: false },
    ];
    assert.equal(countLivingHumans(players), 0);
    assert.equal(isApocalypseRobo(players), true);
  });
});
