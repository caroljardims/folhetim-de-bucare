import {
  ALL_BUCARE_LOCATIONS,
  inhabitantRolesAtLocation,
  LOCATION_LABEL_PT,
  locationVisitResultShortPt,
  type BucareLocation,
  type LocationVisitResultKind,
  type RoleId,
} from "folclore-game-engine";
import { ROLE_DISPLAY } from "./roleStories.js";
import type { PlayerDoc } from "../types.js";

export { ALL_BUCARE_LOCATIONS, LOCATION_LABEL_PT, locationVisitResultShortPt };
export type { BucareLocation, LocationVisitResultKind };

export function pickRandomBucareLocation(): BucareLocation {
  return ALL_BUCARE_LOCATIONS[Math.floor(Math.random() * ALL_BUCARE_LOCATIONS.length)]!;
}

/** Papéis desta partida expulsos/eliminados com identidade revelada. */
export function rolesRevealedOut(
  players: PlayerDoc[],
  revealedRoles?: Record<string, string>,
): Set<string> {
  const out = new Set<string>();
  if (!revealedRoles) return out;
  for (const p of players) {
    if (!p.isBot || !p.id) continue;
    const isOut = p.alive === false || Boolean(p.eliminated) || Boolean(p.expelled);
    const role = revealedRoles[p.id];
    if (isOut && role) out.add(role);
  }
  return out;
}

export type InhabitantLinePart = { role: string; label: string; struck: boolean };

export function inhabitantLineParts(
  tableRoleIds: string[] | undefined,
  location: BucareLocation,
  players: PlayerDoc[],
  revealedRoles?: Record<string, string>,
): InhabitantLinePart[] {
  if (!tableRoleIds?.length) return [];
  const rolesInGame = new Set(tableRoleIds as RoleId[]);
  const roles = inhabitantRolesAtLocation(rolesInGame, location);
  const outRoles = rolesRevealedOut(players, revealedRoles);
  return roles.map((role) => ({
    role,
    label: ROLE_DISPLAY[role] ?? role,
    struck: outRoles.has(role),
  }));
}
