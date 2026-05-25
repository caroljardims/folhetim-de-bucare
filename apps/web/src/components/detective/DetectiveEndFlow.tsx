import { useEffect, useMemo, useState } from "react";
import { ROLE_SIDE, displayRoleName, type RoleId } from "folclore-game-engine";
import type { DetectiveRank, PlayerDoc, RoomDoc } from "../../types.js";
import { ROLE_DISPLAY } from "../../lib/roleStories.js";
import { readDetectiveTheories } from "../../lib/detectiveTheories.js";
import {
  LOCATION_LABEL_PT,
  locationVisitResultShortPt,
  type LocationVisitResultKind,
} from "../../lib/detectiveLocations.js";
import type { LocationHistoryEntry } from "../../types.js";
import { stablePlayerGlyph } from "../../lib/playerGlyph.js";
import { BtnSpinner } from "../BtnSpinner.js";

const GUESSABLE_ROLES = Object.keys(ROLE_DISPLAY).filter((r) => r !== "detetive");

const RANK_COPY: Record<DetectiveRank, string> = {
  NOVATO: "Bucaré guardou seus segredos desta vez.",
  INVESTIGADOR: "Você farejou o perigo — mas o folclore foi mais esperto.",
  DETETIVE: "Impressionante. Bucaré tem poucos como você.",
  LENDA: "A cidade pode dormir. Você viu o que ninguém mais viu.",
};

type Props = {
  room: RoomDoc;
  roomCode: string;
  players: PlayerDoc[];
  playerId: string;
  myPlayer?: PlayerDoc;
  run: (fn: string, data: Record<string, unknown>, key?: string) => Promise<Record<string, unknown>>;
  busy: (key: string) => boolean;
  onPlayAgain: () => void;
  onChangeMode: () => void;
  onChronicle: () => void;
  isAnonymous: boolean;
};

export function DetectiveEndFlow({
  room,
  roomCode,
  players,
  playerId,
  myPlayer,
  run,
  busy,
  onPlayAgain,
  onChangeMode,
  onChronicle,
  isAnonymous,
}: Props) {
  const bots = useMemo(
    () => players.filter((p) => p.isBot && p.id),
    [players],
  );
  const [theories, setTheories] = useState<Record<string, string>>(() =>
    readDetectiveTheories(roomCode),
  );
  const [localPhase, setLocalPhase] = useState<"accusation" | "reveal" | "score">(() => {
    if (room.detectivePhase === "accusation") return "accusation";
    if (room.detectivePhase === "reveal" || room.detectiveScore) return "reveal";
    return "score";
  });

  useEffect(() => {
    if (room.detectiveScore && localPhase === "accusation") {
      setLocalPhase("reveal");
      setRevealIndex(0);
    }
  }, [room.detectiveScore, room.detectivePhase, localPhase]);
  const [revealIndex, setRevealIndex] = useState(0);

  const sortedBots = useMemo(() => {
    const order = (role: string | undefined) => {
      if (!role) return 2;
      const side = ROLE_SIDE[role as RoleId];
      if (side === "criatura") return 0;
      return 1;
    };
    return [...bots].sort((a, b) => {
      const ra = room.revealedRoles?.[a.id!];
      const rb = room.revealedRoles?.[b.id!];
      return order(ra) - order(rb) || String(a.name).localeCompare(String(b.name), "pt");
    });
  }, [bots, room.revealedRoles]);

  useEffect(() => {
    if (localPhase !== "reveal") return;
    if (revealIndex >= sortedBots.length) {
      setLocalPhase("score");
      return;
    }
    const t = window.setTimeout(() => setRevealIndex((i) => i + 1), 1500);
    return () => window.clearTimeout(t);
  }, [localPhase, revealIndex, sortedBots.length]);

  const submitGuesses = async () => {
    const guesses: Record<string, string> = {};
    for (const b of bots) {
      const id = b.id!;
      guesses[id] = theories[id] ?? "unknown";
    }
    await run("submitDetectiveGuesses", { roomCode, guesses }, "detectiveGuesses");
    setLocalPhase("reveal");
    setRevealIndex(0);
  };

  if (localPhase === "accusation") {
    return (
      <div className="detective-end detective-end--accusation">
        <h1 className="detective-end__title">A verdade de Bucaré</h1>
        <p className="detective-end__subtitle">
          Antes do Folhetim revelar tudo — quem você acha que eram os habitantes desta cidade?
        </p>
        <div className="detective-end__cards">
          {bots.map((b) => (
            <div key={b.id} className="detective-suspect-card">
              <span className="detective-suspect-card__glyph">{stablePlayerGlyph(b.id!, playerId, "🔍")}</span>
              <span className="detective-suspect-card__name">{b.name}</span>
              <select
                className="field-input detective-suspect-card__select"
                value={theories[b.id!] ?? "unknown"}
                onChange={(e) => {
                  const v = e.target.value;
                  setTheories((prev) => ({ ...prev, [b.id!]: v }));
                }}
              >
                <option value="unknown">Ainda não sei</option>
                {GUESSABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_DISPLAY[r] ?? r}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="primary-btn"
          disabled={busy("detectiveGuesses")}
          onClick={() => void submitGuesses()}
        >
          <span className="btn-title-row">
            {busy("detectiveGuesses") ? "registrando…" : "Revelar a verdade →"}
            <BtnSpinner show={busy("detectiveGuesses")} />
          </span>
        </button>
      </div>
    );
  }

  if (localPhase === "reveal" && revealIndex < sortedBots.length) {
    const b = sortedBots[revealIndex]!;
    const actual = room.revealedRoles?.[b.id!] ?? "";
    const guess = room.detectiveGuesses?.[b.id!] ?? theories[b.id!] ?? "unknown";
    const correct = guess && guess !== "unknown" && guess === actual;
    return (
      <div className="detective-end detective-end--reveal">
        <div className="detective-reveal-card">
          <p className="detective-reveal-card__name">{b.name}</p>
          <p className="detective-reveal-card__role">{displayRoleName(actual as RoleId)}</p>
          {correct ? (
            <p className="detective-reveal-card__ok">✓ Correto — era {displayRoleName(actual as RoleId)}</p>
          ) : guess === "unknown" || !guess ? (
            <p className="detective-reveal-card__muted">? Não soube — era {displayRoleName(actual as RoleId)}</p>
          ) : (
            <p className="detective-reveal-card__err">
              ✗ Errado — era {displayRoleName(actual as RoleId)}, você achava que era{" "}
              {ROLE_DISPLAY[guess] ?? guess}
            </p>
          )}
        </div>
      </div>
    );
  }

  const score = room.detectiveScore;
  const rank = score?.rank ?? "NOVATO";
  const showNoNet =
    rank === "LENDA" && room.soloModeDifficulty === "investigation";

  const locationHistory = (myPlayer?.locationHistory ?? []) as LocationHistoryEntry[];

  return (
    <div className="detective-end detective-end--score">
      <h1 className="detective-end__rank">{rank}</h1>
      <p className="detective-end__rank-copy">{RANK_COPY[rank]}</p>
      {showNoNet && <p className="detective-end__no-net">LENDA SEM REDE — você não precisou de ajuda.</p>}
      {locationHistory.length > 0 && (
        <div className="detective-end__rondas">
          <h2 className="detective-end__rondas-title">Suas rondas</h2>
          <ul className="detective-end__rondas-list">
            {[...locationHistory]
              .sort((a, b) => a.round - b.round)
              .map((e, i) => (
                <li key={`${e.round}-${e.location}-${i}`}>
                  Rodada {e.round}: investigou {LOCATION_LABEL_PT[e.location as keyof typeof LOCATION_LABEL_PT]} —{" "}
                  {locationVisitResultShortPt(e.result as LocationVisitResultKind)}
                </li>
              ))}
          </ul>
        </div>
      )}
      {score && (
        <div className="detective-end__breakdown">
          <p>
            Criaturas: {score.criaturaCorrect} de {bots.filter((b) => {
              const r = room.revealedRoles?.[b.id!];
              return r && ROLE_SIDE[r as RoleId] === "criatura";
            }).length}
          </p>
          <p>
            Moradores: {score.moradorCorrect} de{" "}
            {bots.filter((b) => {
              const r = room.revealedRoles?.[b.id!];
              return r && ROLE_SIDE[r as RoleId] !== "criatura";
            }).length}
          </p>
          <p>
            Total: {score.correct} de {score.total} personagens identificados
          </p>
        </div>
      )}
      {isAnonymous && (
        <p className="copy-muted detective-end__anon">Crie uma conta para salvar seu progresso.</p>
      )}
      <div className="detective-end__actions">
        <button type="button" className="primary-btn" onClick={onPlayAgain}>
          Jogar de novo
        </button>
        <button type="button" className="ghost-btn" onClick={onChronicle}>
          Ver crônica completa
        </button>
        <button type="button" className="ghost-btn" onClick={onChangeMode}>
          Mudar dificuldade
        </button>
      </div>
    </div>
  );
}
