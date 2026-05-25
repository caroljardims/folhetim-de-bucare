import { describe, expect, it } from "vitest";
import {
  isGossipFolhetimMessage,
  locationsWithActiveInhabitants,
  pickGossipEntries,
  pickReconhecimentoClue,
  RECONHECIMENTO_CLUES,
} from "./reconhecimentoClues.js";
import type { RoleId } from "./types.js";

describe("reconhecimentoClues", () => {
  it("pickReconhecimentoClue returns text from pool", () => {
    const text = pickReconhecimentoClue("fazenda", () => 0);
    expect(text).toBe(RECONHECIMENTO_CLUES.fazenda[0]);
  });

  it("locationsWithActiveInhabitants lists only occupied locations", () => {
    const roles = new Set<RoleId>(["lobisomem", "saci", "detetive"]);
    const locs = locationsWithActiveInhabitants(roles);
    expect(locs).toContain("fazenda");
    expect(locs).toContain("lanchonete");
    expect(locs).not.toContain("cemiterio");
  });

  it("pickGossipEntries returns 2 or 3 distinct bots", () => {
    const bots = [
      { botId: "b1", name: "Ana", role: "lobisomem" as RoleId },
      { botId: "b2", name: "Beto", role: "saci" as RoleId },
      { botId: "b3", name: "Ciro", role: "doutor" as RoleId },
      { botId: "b4", name: "Dora", role: "aldeao" as RoleId },
    ];
    const roles = new Set(bots.map((b) => b.role));
    const entries = pickGossipEntries(bots, roles, () => 0.99);
    expect(entries.length).toBeGreaterThanOrEqual(2);
    expect(entries.length).toBeLessThanOrEqual(3);
    const ids = new Set(entries.map((e) => e.botId));
    expect(ids.size).toBe(entries.length);
    expect(entries.every((e) => isGossipFolhetimMessage(e.message))).toBe(true);
  });
});
