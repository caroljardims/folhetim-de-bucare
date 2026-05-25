import type { RoleId } from "folclore-game-engine";
import type { BotContext, Rng } from "./types.js";

const TYPO_POOL = ["nao sei o qeu acho disso", "tnho minhas duvidas", "isso nao fecha pra mim"];

function injectTypo(phrase: string, rng: Rng): string {
  if (rng() >= 0.85) return phrase;
  const typo = TYPO_POOL[Math.floor(rng() * TYPO_POOL.length)]!;
  return `${phrase} ${typo}`;
}

/** Ajustes de frase após `postProcess` do personagem (tells sutis). */
export function applyCharacterTellPhrase(
  phrase: string,
  role: RoleId,
  ctx: BotContext,
  rng: Rng,
): string {
  let out = phrase;

  if (role === "lobisomem") {
    out = injectTypo(out, rng);
  } else if (rng() < 0.1) {
    out = injectTypo(out, rng);
  }

  if (role === "saci" && rng() < 0.5) {
    out += rng() < 0.5 ? " kkkkk" : " hahaha";
  } else if (rng() < 0.15) {
    out += " rs";
  }

  if (role === "boto") {
    out = out.replace(/!/g, ".");
    if (rng() < 0.35) out += " 🌹";
  } else if (rng() < 0.1 && role !== "boto") {
    out += " 🌹";
  }

  if (role === "iara") {
    for (const pl of ctx.livingPlayers) {
      const n = pl.name;
      if (n && out.includes(n)) {
        out = out.replaceAll(n, "alguém");
      }
    }
  }

  if (role === "padre" && ctx.messageIndex === 0 && rng() < 0.6) {
    out = `Sim, ${out.charAt(0).toLowerCase()}${out.slice(1)}`;
  }

  if (role === "coronel" && rng() < 0.35) {
    out += " Isso tá afetando os negócios da cidade.";
  }

  if (role === "bras_cubas" && rng() < 0.4) {
    out = `Eu diria que ${out.charAt(0).toLowerCase()}${out.slice(1)} — ninguém aqui age sem interesse próprio. Eu incluso, claro.`;
  }

  if (role === "doutor" && rng() < 0.25) {
    out += " Espero que todos estejam bem.";
  }

  return out.trim();
}
