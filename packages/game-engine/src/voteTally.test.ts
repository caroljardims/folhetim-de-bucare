import { describe, expect, it } from "vitest";
import { tallyExpulsionVotes } from "./voteTally.js";

describe("tallyExpulsionVotes", () => {
  it("picks single leader", () => {
    const r = tallyExpulsionVotes(
      [
        { voterId: "a", targetId: "x" },
        { voterId: "b", targetId: "x" },
        { voterId: "c", targetId: "y" },
      ],
      {},
    );
    expect(r.expelledId).toBe("x");
  });

  it("empate sem expulsão", () => {
    const r = tallyExpulsionVotes(
      [
        { voterId: "a", targetId: "x" },
        { voterId: "b", targetId: "y" },
      ],
      {},
    );
    expect(r.expelledId).toBeNull();
  });

  it("peso duplo em Brás", () => {
    const r = tallyExpulsionVotes(
      [
        { voterId: "a", targetId: "bras" },
        { voterId: "b", targetId: "x" },
        { voterId: "c", targetId: "bras" },
        { voterId: "d", targetId: "bras" },
      ],
      { doubleVotesOnBras: true, brasPlayerId: "bras", eligibleVoterCount: 7 },
    );
    expect(r.expelledId).toBe("bras");
  });

  it("um voto isolado não expulsa sem maioria absoluta", () => {
    const r = tallyExpulsionVotes(
      [
        { voterId: "a", targetId: "dorinha" },
        { voterId: "b", targetId: "catirina" },
        { voterId: "c", targetId: "caboclo" },
        { voterId: "d", targetId: "hellen" },
        { voterId: "e", targetId: "bentinho" },
      ],
      { eligibleVoterCount: 7 },
    );
    expect(r.expelledId).toBeNull();
  });

  it("exige maioria absoluta dos elegíveis", () => {
    const r = tallyExpulsionVotes(
      [
        { voterId: "a", targetId: "x" },
        { voterId: "b", targetId: "x" },
        { voterId: "c", targetId: "x" },
        { voterId: "d", targetId: "x" },
        { voterId: "e", targetId: "y" },
        { voterId: "f", targetId: "y" },
        { voterId: "g", targetId: "y" },
      ],
      { eligibleVoterCount: 7 },
    );
    expect(r.expelledId).toBe("x");
  });
});
