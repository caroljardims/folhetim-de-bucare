import { ROLE_SIDE } from "folclore-game-engine";
import type { RoleId } from "folclore-game-engine";

export const brasExpulsionTeaseMessage = (name: string): string =>
  `Espera. ${name} sorri. A praça votou pela sua saída — mas ele não parece abatido.`;

export const brasToloRevealEndMessage = (name: string): string =>
  `Espera. ${name} sorri. Era o Tolo — e ser expulso era exatamente o que queria.`;

/** Folhetim público ao continuar — sem acusar o Tolo nem revelar o papel novo. */
export const brasContinueCoverMessage = (name: string): string =>
  `Antes do toque de recolher, ${name} reaparece na praça. Dizem que a expulsão levou embora um parente distante — e que quem voltou jurou nunca ter ido.`;

export function computeBrasAvailableRoles(
  players: Array<{
    id: string;
    alive?: boolean;
    eliminated?: boolean;
    expelled?: boolean;
  }>,
  secrets: Record<string, { role?: string } | undefined>,
  expelledPlayerId: string,
): RoleId[] {
  const taken = new Set(
    players
      .filter(
        (p) =>
          p.id !== expelledPlayerId &&
          p.alive !== false &&
          !p.eliminated &&
          !p.expelled,
      )
      .map((p) => secrets[p.id]?.role)
      .filter((r): r is string => Boolean(r)),
  );
  return (Object.keys(ROLE_SIDE) as RoleId[]).filter((r) => !taken.has(r));
}
