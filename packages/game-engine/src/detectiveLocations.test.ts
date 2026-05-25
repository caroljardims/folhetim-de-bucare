import { describe, expect, it } from "vitest";
import type { NightActionInput } from "./types.js";
import {
  inhabitantRolesAtLocation,
  resolveDetectiveLocationVisit,
  wasRoleAbsentAtNight,
} from "./detectiveLocations.js";

describe("wasRoleAbsentAtNight", () => {
  it("padre e coronel nunca ausentes", () => {
    expect(wasRoleAbsentAtNight("padre", { role: "padre", action: "catechize", targetId: "x", specialAction: null })).toBe(
      false,
    );
    expect(wasRoleAbsentAtNight("coronel", undefined)).toBe(false);
  });

  it("delegado ausente só ao prender", () => {
    expect(wasRoleAbsentAtNight("delegado", { role: "delegado", action: "pass", targetId: null, specialAction: null })).toBe(
      false,
    );
    expect(
      wasRoleAbsentAtNight("delegado", { role: "delegado", action: "jail", targetId: "x", specialAction: "motivo longo" }),
    ).toBe(true);
  });

  it("cangaceiro ausente só com consulta", () => {
    expect(wasRoleAbsentAtNight("cangaceiro", { role: "cangaceiro", action: "pass", targetId: null, specialAction: null })).toBe(
      false,
    );
    expect(
      wasRoleAbsentAtNight("cangaceiro", { role: "cangaceiro", action: "query", targetId: "x", specialAction: null }),
    ).toBe(true);
  });

  it("lobisomem sempre ausente com ação", () => {
    expect(
      wasRoleAbsentAtNight("lobisomem", { role: "lobisomem", action: "eliminate", targetId: "x", specialAction: null }),
    ).toBe(true);
  });
});

describe("resolveDetectiveLocationVisit", () => {
  const roles = new Set(["lobisomem", "coronel", "saci"] as const);
  const playerIdByRole = new Map([
    ["lobisomem", "w"],
    ["coronel", "c"],
    ["saci", "s"],
  ] as const);

  it("fazenda com dois habitantes e um ausente → mixed", () => {
    const nightActions: Record<string, NightActionInput> = {
      w: { role: "lobisomem", action: "eliminate", targetId: "t", specialAction: null },
    };
    const res = resolveDetectiveLocationVisit({
      location: "fazenda",
      rolesInGame: roles,
      nightActionsByPlayerId: nightActions,
      playerIdByRole,
    });
    expect(res.inhabitants).toBe(2);
    expect(res.result).toBe("mixed");
    expect(res.absentCount).toBe(1);
    expect(res.privateMessage).toContain("movimento");
  });

  it("local sem habitantes na mesa → empty", () => {
    const res = resolveDetectiveLocationVisit({
      location: "tenda",
      rolesInGame: roles,
      nightActionsByPlayerId: {},
      playerIdByRole,
    });
    expect(res.result).toBe("empty");
    expect(res.inhabitants).toBe(0);
  });

  it("floresta só curupira ausente → all_absent com mensagem singular", () => {
    const solo = new Set(["curupira"] as const);
    const map = new Map([["curupira", "cu"]] as const);
    const res = resolveDetectiveLocationVisit({
      location: "floresta",
      rolesInGame: solo,
      nightActionsByPlayerId: {
        cu: { role: "curupira", action: "protect", targetId: "x", specialAction: null },
      },
      playerIdByRole: map,
    });
    expect(res.result).toBe("all_absent");
    expect(res.privateMessage).toContain("habitante passou");
  });
});

describe("inhabitantRolesAtLocation", () => {
  it("agrupa papéis da fazenda", () => {
    const roles = new Set(["lobisomem", "boitata", "coronel", "saci"] as const);
    expect(inhabitantRolesAtLocation(roles, "fazenda").sort()).toEqual(["boitata", "coronel", "lobisomem"]);
  });
});
