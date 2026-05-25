import { describe, expect, it } from "vitest";
import {
  LOBISOMEM_R4_FOLHETIM_MARKER,
  lobisomemObjectiveR4FolhetimMessage,
  parseLobisomemObjectiveR4Folhetim,
} from "./copy.js";

describe("lobisomemObjectiveR4FolhetimMessage", () => {
  it("substitui {name} e preserva parágrafos", () => {
    const msg = lobisomemObjectiveR4FolhetimMessage("Severino");
    expect(msg.startsWith(LOBISOMEM_R4_FOLHETIM_MARKER)).toBe(true);
    expect(msg).toContain("E Severino observava");
    expect(msg).toContain("Severino ainda está entre vocês");
    expect(msg).not.toContain("{name}");

    const parsed = parseLobisomemObjectiveR4Folhetim(msg);
    expect(parsed?.manchete).toBe("QUATRO LUAS");
    expect(parsed?.paragraphs.length).toBe(5);
    expect(parsed?.paragraphs[0]).toBe("Quatro luas. Era tudo que a fera precisava.");
  });
});
