import { describe, expect, it } from "vitest";
import {
  individualWinEndsGame,
  maybeLobisomemSurvivedR4Win,
  pickRoundIndividualGameEndingWin,
} from "./individualVictory.js";
import type { IndividualWinEntry } from "./types.js";

describe("individualVictory", () => {
  it("lobisomem R4 win only after dawn of round 4 when wolf survived", () => {
    const win = maybeLobisomemSurvivedR4Win({
      round: 4,
      wolfPlayerId: "wolf1",
      wolfAlreadyMet: false,
      wolfAlive: true,
      wolfEliminated: false,
      wolfExpelled: false,
      existingWinTypes: [],
      timestamp: 1000,
    });
    expect(win?.type).toBe("lobisomem_survived_r4");
    expect(win?.round).toBe(4);
  });

  it("does not grant lobisomem R4 at start of round 4 (round !== 4 dawn)", () => {
    expect(
      maybeLobisomemSurvivedR4Win({
        round: 4,
        wolfPlayerId: "wolf1",
        wolfAlreadyMet: false,
        wolfAlive: true,
        wolfEliminated: false,
        wolfExpelled: false,
        existingWinTypes: [],
        timestamp: 1,
      }),
    ).not.toBeNull();
    expect(
      maybeLobisomemSurvivedR4Win({
        round: 3,
        wolfPlayerId: "wolf1",
        wolfAlreadyMet: false,
        wolfAlive: true,
        wolfEliminated: false,
        wolfExpelled: false,
        existingWinTypes: [],
        timestamp: 1,
      }),
    ).toBeNull();
  });

  it("does not grant lobisomem R4 if wolf died that night", () => {
    expect(
      maybeLobisomemSurvivedR4Win({
        round: 4,
        wolfPlayerId: "wolf1",
        wolfAlreadyMet: false,
        wolfAlive: false,
        wolfEliminated: true,
        wolfExpelled: false,
        existingWinTypes: [],
        timestamp: 1,
      }),
    ).toBeNull();
  });

  it("pickRoundIndividualGameEndingWin selects ending win for the round", () => {
    const wins: IndividualWinEntry[] = [
      {
        playerId: "w",
        role: "lobisomem",
        type: "lobisomem_survived_r4",
        round: 4,
        timestamp: 50,
      },
      {
        playerId: "x",
        role: "aldeao",
        type: "curupira_cinco_objetivo",
        round: 4,
        timestamp: 99,
      },
    ];
    const picked = pickRoundIndividualGameEndingWin(wins, 4);
    expect(picked?.type).toBe("lobisomem_survived_r4");
    expect(individualWinEndsGame("lobisomem_survived_r4")).toBe(true);
    expect(individualWinEndsGame("curupira_cinco_objetivo")).toBe(false);
  });
});
