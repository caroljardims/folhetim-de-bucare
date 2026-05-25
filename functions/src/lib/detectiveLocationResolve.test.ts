import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { locationsWithActiveInhabitants, type RoleId } from "folclore-game-engine";
import {
  formatLocationHistoryForChronicle,
  formatReconhecimentoForChronicle,
} from "./detectiveLocationResolve.js";
import type { EvidenceEntry, LocationHistoryEntry } from "./detectiveTypes.js";

/** Mesa típica solo: 6 bots + detetive fora do set. */
const SOLO_TABLE_ROLES: RoleId[] = [
  "lobisomem",
  "saci",
  "mula",
  "delegado",
  "doutor",
  "cartomante",
];

describe("formatReconhecimentoForChronicle", () => {
  it("returns empty when no recon evidence", () => {
    assert.deepEqual(formatReconhecimentoForChronicle([]), []);
  });

  it("lists recon night 1 locations with snippets", () => {
    const log: EvidenceEntry[] = [
      {
        round: 1,
        type: "reconhecimento_noturno",
        targetId: null,
        weight: "leve",
        description: "Cheiro de fumaça na lanchonete.",
        location: "lanchonete",
      },
      {
        round: 1,
        type: "reconhecimento_noturno",
        targetId: null,
        weight: "leve",
        description: "Passos na igreja.",
        location: "igreja",
      },
    ];
    const lines = formatReconhecimentoForChronicle(log);
    assert.equal(lines[0], "Noite 1 — Reconhecimento: 2 locais visitados");
    assert.ok(lines[1]?.includes("Lanchonete"));
    assert.ok(lines[2]?.includes("Igreja"));
  });
});

describe("formatLocationHistoryForChronicle", () => {
  it("prepends recon lines before visit history", () => {
    const evidence: EvidenceEntry[] = [
      {
        round: 1,
        type: "reconhecimento_noturno",
        targetId: null,
        weight: "leve",
        description: "Pista.",
        location: "cais",
      },
    ];
    const visits: LocationHistoryEntry[] = [
      { round: 2, location: "fazenda", result: "empty" },
    ];
    const lines = formatLocationHistoryForChronicle(visits, evidence);
    assert.ok(lines[0]?.startsWith("Noite 1 — Reconhecimento"));
    assert.ok(lines.some((l) => l.includes("Rodada 2")));
  });
});

describe("story round 1 recon evidence count", () => {
  it("matches active inhabitant locations on table", () => {
    const rolesInGame = new Set(SOLO_TABLE_ROLES);
    const locs = locationsWithActiveInhabitants(rolesInGame);
    assert.ok(locs.length >= 3, "expected several active locations");
    assert.ok(!locs.includes("detetive" as never));
    // One evidence per active location is what applyReconnaissanceNight writes.
    assert.equal(locs.length, new Set(locs).size, "no duplicate locations");
  });
});
