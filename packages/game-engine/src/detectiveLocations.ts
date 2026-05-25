import type { NightActionInput, RoleId } from "./types.js";

/** Lugares de Bucaré rondados pelo Detetive (Modo Detetive). */
export type BucareLocation =
  | "fazenda"
  | "lanchonete"
  | "cais"
  | "rio"
  | "igreja"
  | "floresta"
  | "posto_de_saude"
  | "tenda"
  | "terreiro"
  | "casa"
  | "cemiterio";

export const ALL_BUCARE_LOCATIONS: BucareLocation[] = [
  "fazenda",
  "lanchonete",
  "cais",
  "rio",
  "igreja",
  "floresta",
  "posto_de_saude",
  "tenda",
  "terreiro",
  "casa",
  "cemiterio",
];

export const ROLE_LOCATIONS: Record<RoleId, BucareLocation> = {
  lobisomem: "fazenda",
  saci: "lanchonete",
  boto: "cais",
  iara: "rio",
  mula: "igreja",
  boitata: "fazenda",
  curupira: "floresta",
  coronel: "fazenda",
  delegado: "lanchonete",
  geni: "cais",
  cangaceiro: "rio",
  doutor: "posto_de_saude",
  cartomante: "tenda",
  mae_de_santo: "terreiro",
  padre: "igreja",
  aldeao: "casa",
  bras_cubas: "cemiterio",
  detetive: "casa",
};

export const LOCATION_LABEL_PT: Record<BucareLocation, string> = {
  fazenda: "Fazenda",
  lanchonete: "Lanchonete",
  cais: "Cais",
  rio: "Rio",
  igreja: "Igreja",
  floresta: "Floresta",
  posto_de_saude: "Posto de Saúde",
  tenda: "Tenda Misteriosa",
  terreiro: "Terreiro",
  casa: "Casas dos Moradores",
  cemiterio: "Cemitério",
};

export type LocationVisitResultKind = "empty" | "all_present" | "all_absent" | "mixed";

export type LocationInvestigationResult = {
  location: BucareLocation;
  inhabitants: number;
  presentCount: number;
  absentCount: number;
  result: LocationVisitResultKind;
  privateMessage: string;
};

export function isBucareLocation(value: string): value is BucareLocation {
  return (ALL_BUCARE_LOCATIONS as string[]).includes(value);
}

/** Papéis vivos na mesa que habitam o lugar (composição desta partida). */
export function inhabitantRolesAtLocation(
  rolesInGame: Set<RoleId>,
  location: BucareLocation,
): RoleId[] {
  const out: RoleId[] = [];
  for (const role of rolesInGame) {
    if (role === "detetive") continue;
    if (ROLE_LOCATIONS[role] === location) out.push(role);
  }
  return out;
}

/**
 * O habitante estava ausente do lugar habitual nesta noite?
 * Não revela identidade — só presença/ausência agregada.
 */
export function wasRoleAbsentAtNight(
  role: RoleId,
  action: NightActionInput | undefined,
): boolean {
  if (role === "padre" || role === "coronel" || role === "aldeao" || role === "bras_cubas" || role === "detetive") {
    return false;
  }

  if (!action) {
    if (role === "cangaceiro" || role === "delegado") return false;
    return false;
  }

  if (role === "delegado") {
    return action.action === "jail" && Boolean(action.targetId);
  }
  if (role === "cangaceiro") {
    return action.action === "query" && Boolean(action.targetId);
  }

  if (action.action === "pass") return false;

  return true;
}

function buildPrivateMessage(
  locationLabel: string,
  inhabitants: number,
  result: LocationVisitResultKind,
): string {
  if (inhabitants === 0) {
    return `${locationLabel} estava deserto. Ninguém de Bucaré costuma passar a noite por lá.`;
  }
  if (inhabitants === 1) {
    if (result === "all_present") {
      return `${locationLabel} estava ocupado. Seu habitante estava lá, quieto.`;
    }
    if (result === "all_absent") {
      return `${locationLabel} estava vazio. Seu habitante passou a noite em outro lugar.`;
    }
  }
  switch (result) {
    case "all_present":
      return `${locationLabel} estava quieto esta noite. Quem mora por lá não saiu.`;
    case "all_absent":
      return `${locationLabel} estava vazio. Quem mora por lá estava em outro lugar esta noite.`;
    case "mixed":
      return `${locationLabel} tinha movimento esta noite — mas nem todos os que costumam estar lá foram encontrados.`;
    default:
      return `${locationLabel} estava deserto. Ninguém de Bucaré costuma passar a noite por lá.`;
  }
}

export function resolveDetectiveLocationVisit(params: {
  location: BucareLocation;
  rolesInGame: Set<RoleId>;
  /** nightActions[playerId] por habitante */
  nightActionsByPlayerId: Record<string, NightActionInput | undefined>;
  /** role → playerId (vivos na mesa) */
  playerIdByRole: Map<RoleId, string>;
}): LocationInvestigationResult {
  const { location, rolesInGame, nightActionsByPlayerId, playerIdByRole } = params;
  const locationLabel = LOCATION_LABEL_PT[location];
  const inhabitantRoles = inhabitantRolesAtLocation(rolesInGame, location);
  const inhabitants = inhabitantRoles.length;

  if (inhabitants === 0) {
    return {
      location,
      inhabitants: 0,
      presentCount: 0,
      absentCount: 0,
      result: "empty",
      privateMessage: buildPrivateMessage(locationLabel, 0, "empty"),
    };
  }

  let absentCount = 0;
  for (const role of inhabitantRoles) {
    const pid = playerIdByRole.get(role);
    const action = pid ? nightActionsByPlayerId[pid] : undefined;
    if (wasRoleAbsentAtNight(role, action)) absentCount++;
  }
  const presentCount = inhabitants - absentCount;

  let result: LocationVisitResultKind;
  if (absentCount === 0) result = "all_present";
  else if (absentCount === inhabitants) result = "all_absent";
  else result = "mixed";

  return {
    location,
    inhabitants,
    presentCount,
    absentCount,
    result,
    privateMessage: buildPrivateMessage(locationLabel, inhabitants, result),
  };
}

/** Rótulo curto para o mapa / crônica (sem revelar nomes). */
export function locationVisitResultShortPt(kind: LocationVisitResultKind): string {
  switch (kind) {
    case "all_present":
      return "ocupado";
    case "all_absent":
      return "vazio";
    case "mixed":
      return "movimento suspeito";
    case "empty":
      return "deserto";
  }
}
