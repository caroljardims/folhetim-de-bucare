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
import "./DetectiveNotebook.css";
import "./DetectiveEndFlow.css";

const GUESSABLE_ROLES = Object.keys(ROLE_DISPLAY).filter((r) => r !== "detetive");

const CARD_STAGGER_MS = 1500;
const ACT_PAUSE_MS = 2000;
const CONTINUE_PAUSE_MS = 2000;
const HEADER_MS = 600;

const RANK_NARRATIVE: Record<DetectiveRank, (name: string) => string> = {
  NOVATO: (name) =>
    `Em sua primeira noite em Bucaré, o Detetive ${name} deparou-se com os mistérios que a cidade guarda. Os segredos resistiram desta vez.`,
  INVESTIGADOR: (name) =>
    `O Detetive ${name} farejou o perigo entre os habitantes de Bucaré. O folclore foi mais esperto — mas por pouco.`,
  DETETIVE: (name) =>
    `Poucas pessoas chegam tão longe quanto o Detetive ${name} chegou esta noite. Bucaré tem muito a temer deste investigador.`,
  LENDA: (name) =>
    `Esta noite, Bucaré não tinha segredos para o Detetive ${name}. A cidade pode dormir — mas só porque ele assim o permite.`,
};

type RevealMachine =
  | { step: "criatura-header" }
  | { step: "criatura-cards"; visible: number }
  | { step: "act-pause" }
  | { step: "morador-header" }
  | { step: "morador-cards"; visible: number }
  | { step: "finish-pause" }
  | { step: "continue" };

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
  /** Solo end orchestrator: show only this phase. */
  forcedPhase?: "accusation" | "reveal" | "score";
  orchestrated?: boolean;
  onAccusationSubmitted?: () => void;
  onRevealComplete?: () => void;
};

function sideLabel(role: string): string {
  const side = ROLE_SIDE[role as RoleId];
  if (side === "criatura") return "Criatura";
  if (side === "neutro") return "Neutro";
  return "Morador";
}

function guessVerdict(guess: string, actual: string): "correct" | "wrong" | "unknown" {
  if (!guess || guess === "unknown") return "unknown";
  return guess === actual ? "correct" : "wrong";
}

function formatClippingDate(): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function RevealCharacterCard({
  bot,
  playerId,
  actual,
  guess,
  animateIn,
}: {
  bot: PlayerDoc;
  playerId: string;
  actual: string;
  guess: string;
  animateIn: boolean;
}) {
  const verdict = guessVerdict(guess, actual);
  const roleName = displayRoleName(actual as RoleId);

  return (
    <article
      className={`detective-reveal-card detective-reveal-card--${verdict}${
        animateIn ? " detective-reveal-card--animate-in" : ""
      }`}
    >
      <div className="detective-reveal-card__head">
        <span className="detective-reveal-card__glyph" aria-hidden>
          {stablePlayerGlyph(bot.id!, playerId, "🔍")}
        </span>
        <div className="detective-reveal-card__identity">
          <p className="detective-reveal-card__name">{bot.name}</p>
          <p className="detective-reveal-card__role-line">
            era: <strong>{roleName}</strong>
          </p>
          <p className="detective-reveal-card__side-line">
            lado: <strong>{sideLabel(actual)}</strong>
          </p>
        </div>
      </div>
      <div className="detective-reveal-card__verdict">
        {verdict === "correct" && (
          <span className="detective-reveal-badge detective-reveal-badge--correct">✓ Correto</span>
        )}
        {verdict === "wrong" && (
          <>
            <span className="detective-reveal-badge detective-reveal-badge--wrong">✗ Errado</span>
            <p className="detective-reveal-card__guess-note">
              você achava que era {ROLE_DISPLAY[guess] ?? displayRoleName(guess as RoleId)}
            </p>
          </>
        )}
        {verdict === "unknown" && (
          <>
            <span className="detective-reveal-badge detective-reveal-badge--unknown">? Não soube</span>
            <p className="detective-reveal-card__guess-note">era {roleName}</p>
          </>
        )}
      </div>
    </article>
  );
}

function RevealActHeader({ title, variant }: { title: string; variant: "criatura" | "morador" }) {
  return (
    <header className={`detective-reveal-act detective-reveal-act--${variant === "morador" ? "moradores" : "criaturas"}`}>
      <div className="detective-reveal-act__header">
        <hr className="detective-reveal-act__rule" aria-hidden />
        <h2 className="detective-reveal-act__title">{title}</h2>
        <hr className="detective-reveal-act__rule" aria-hidden />
      </div>
    </header>
  );
}

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
  forcedPhase,
  orchestrated = false,
  onAccusationSubmitted,
  onRevealComplete,
}: Props) {
  const bots = useMemo(
    () => players.filter((p) => p.isBot && p.id),
    [players],
  );
  const [theories, setTheories] = useState<Record<string, string>>(() =>
    readDetectiveTheories(roomCode),
  );
  const [localPhase, setLocalPhase] = useState<"accusation" | "reveal" | "score">(() => {
    if (forcedPhase) return forcedPhase;
    if (room.detectivePhase === "accusation") return "accusation";
    if (room.detectivePhase === "reveal" || room.detectiveScore) return "reveal";
    return "score";
  });
  const [revealMachine, setRevealMachine] = useState<RevealMachine>({ step: "criatura-header" });

  const displayPhase = forcedPhase ?? localPhase;

  useEffect(() => {
    if (forcedPhase) setLocalPhase(forcedPhase);
  }, [forcedPhase]);

  useEffect(() => {
    if (orchestrated) return;
    if (room.detectiveScore && localPhase === "accusation") {
      setLocalPhase("reveal");
      setRevealMachine({ step: "criatura-header" });
    }
  }, [room.detectiveScore, room.detectivePhase, localPhase, orchestrated]);

  const { criaturaBots, moradorBots } = useMemo(() => {
    const criatura: PlayerDoc[] = [];
    const morador: PlayerDoc[] = [];
    for (const b of bots) {
      const role = room.revealedRoles?.[b.id!];
      if (role && ROLE_SIDE[role as RoleId] === "criatura") {
        criatura.push(b);
      } else {
        morador.push(b);
      }
    }
    criatura.sort((a, b) => String(a.name).localeCompare(String(b.name), "pt"));
    morador.sort((a, b) => String(a.name).localeCompare(String(b.name), "pt"));
    return { criaturaBots: criatura, moradorBots: morador };
  }, [bots, room.revealedRoles]);

  useEffect(() => {
    if (displayPhase !== "reveal") return;

    let id: ReturnType<typeof setTimeout>;
    const m = revealMachine;

    if (m.step === "criatura-header") {
      id = setTimeout(() => {
        if (criaturaBots.length === 0) {
          setRevealMachine({ step: "act-pause" });
        } else {
          setRevealMachine({ step: "criatura-cards", visible: 1 });
        }
      }, HEADER_MS);
    } else if (m.step === "criatura-cards") {
      if (m.visible < criaturaBots.length) {
        id = setTimeout(() => {
          setRevealMachine({ step: "criatura-cards", visible: m.visible + 1 });
        }, CARD_STAGGER_MS);
      } else {
        id = setTimeout(() => setRevealMachine({ step: "act-pause" }), ACT_PAUSE_MS);
      }
    } else if (m.step === "act-pause") {
      id = setTimeout(() => {
        if (moradorBots.length === 0) {
          setRevealMachine({ step: "finish-pause" });
        } else {
          setRevealMachine({ step: "morador-header" });
        }
      }, 0);
    } else if (m.step === "morador-header") {
      id = setTimeout(() => {
        setRevealMachine({ step: "morador-cards", visible: 1 });
      }, HEADER_MS);
    } else if (m.step === "morador-cards") {
      if (m.visible < moradorBots.length) {
        id = setTimeout(() => {
          setRevealMachine({ step: "morador-cards", visible: m.visible + 1 });
        }, CARD_STAGGER_MS);
      } else {
        id = setTimeout(() => setRevealMachine({ step: "finish-pause" }), ACT_PAUSE_MS);
      }
    } else if (m.step === "finish-pause") {
      id = setTimeout(() => setRevealMachine({ step: "continue" }), CONTINUE_PAUSE_MS);
    }

    return () => clearTimeout(id);
  }, [displayPhase, revealMachine, criaturaBots.length, moradorBots.length]);

  const revealUi = useMemo(() => {
    const m = revealMachine;
    let criaturaVisible = 0;
    let moradorVisible = 0;
    let showCriaturaHeader = false;
    let showMoradorHeader = false;
    let showContinue = false;

    switch (m.step) {
      case "criatura-header":
        showCriaturaHeader = criaturaBots.length > 0;
        break;
      case "criatura-cards":
        showCriaturaHeader = true;
        criaturaVisible = m.visible;
        break;
      case "act-pause":
        showCriaturaHeader = criaturaBots.length > 0;
        criaturaVisible = criaturaBots.length;
        break;
      case "morador-header":
        showCriaturaHeader = criaturaBots.length > 0;
        criaturaVisible = criaturaBots.length;
        showMoradorHeader = moradorBots.length > 0;
        break;
      case "morador-cards":
        showCriaturaHeader = criaturaBots.length > 0;
        criaturaVisible = criaturaBots.length;
        showMoradorHeader = true;
        moradorVisible = m.visible;
        break;
      case "finish-pause":
        showCriaturaHeader = criaturaBots.length > 0;
        criaturaVisible = criaturaBots.length;
        showMoradorHeader = moradorBots.length > 0;
        moradorVisible = moradorBots.length;
        break;
      case "continue":
        showCriaturaHeader = criaturaBots.length > 0;
        criaturaVisible = criaturaBots.length;
        showMoradorHeader = moradorBots.length > 0;
        moradorVisible = moradorBots.length;
        showContinue = true;
        break;
    }

    return { criaturaVisible, moradorVisible, showCriaturaHeader, showMoradorHeader, showContinue };
  }, [revealMachine, criaturaBots.length, moradorBots.length]);

  const submitGuesses = async () => {
    const guesses: Record<string, string> = {};
    for (const b of bots) {
      const id = b.id!;
      guesses[id] = theories[id] ?? "unknown";
    }
    await run("submitDetectiveGuesses", { roomCode, guesses }, "detectiveGuesses");
    if (orchestrated && onAccusationSubmitted) {
      onAccusationSubmitted();
    } else {
      setLocalPhase("reveal");
      setRevealMachine({ step: "criatura-header" });
    }
  };

  const goToScore = () => {
    if (orchestrated && onRevealComplete) {
      onRevealComplete();
    } else {
      setLocalPhase("score");
    }
  };

  const getGuess = (botId: string) => room.detectiveGuesses?.[botId] ?? theories[botId] ?? "unknown";

  const overlayActive = !orchestrated && room.status !== "ended";

  if (displayPhase === "accusation") {
    return (
      <div className={overlayActive ? "detective-end-overlay" : undefined}>
      <div className="detective-end detective-end--accusation">
        <h1 className="detective-end__title">A verdade de Bucaré</h1>
        <p className="detective-end__subtitle">
          Antes do Folhetim revelar tudo — quem você acha que eram os habitantes desta cidade?
        </p>
        <div className="caderno-wrap caderno-wrap--final">
          <div className="caderno caderno--final">
            <div className="caderno__paper">
              <div className="caderno__body-scroll caderno__body-scroll--final">
                <span className="caderno-stamp caderno-stamp--title">Acusação final</span>
                <p className="caderno-final-lead">
                  Registre sua teoria sobre cada habitante. Depois, entregue o caderno à cidade.
                </p>
                <div className="caderno-suspects caderno-suspects--final">
                  {bots.map((b) => (
                    <div key={b.id} className="caderno-suspect caderno-suspect--accusation">
                      <div className="caderno-suspect__head caderno-suspect__head--static">
                        <span className="caderno-suspect__glyph" aria-hidden>
                          {stablePlayerGlyph(b.id!, playerId, "🔍")}
                        </span>
                        <span className="caderno-suspect__name-block">
                          <span className="caderno-suspect__name">{b.name}</span>
                        </span>
                      </div>
                      <div className="caderno-theory caderno-theory--accusation">
                        <span className="caderno-stamp caderno-stamp--theory">Minha teoria</span>
                        <select
                          className="caderno-theory__select"
                          value={theories[b.id!] ?? "unknown"}
                          aria-label={`Teoria final sobre ${b.name}`}
                          onChange={(e) => {
                            const v = e.target.value;
                            setTheories((prev) => ({ ...prev, [b.id!]: v }));
                          }}
                        >
                          <option value="unknown">ainda não sei...</option>
                          {GUESSABLE_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_DISPLAY[r] ?? r}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="caderno-final-foot" aria-hidden>
                  ─────── ✦ ───────
                </p>
              </div>
            </div>
          </div>
        </div>
        <button
          type="button"
          className="primary-btn detective-final-cta"
          disabled={busy("detectiveGuesses")}
          onClick={() => void submitGuesses()}
        >
          <span className="btn-title btn-title-row">
            {busy("detectiveGuesses") ? "registrando…" : "Revelar a verdade →"}
            <BtnSpinner show={busy("detectiveGuesses")} />
          </span>
        </button>
      </div>
      </div>
    );
  }

  if (displayPhase === "reveal") {
    const { criaturaVisible, moradorVisible, showCriaturaHeader, showMoradorHeader, showContinue } = revealUi;

    return (
      <div className={overlayActive ? "detective-end-overlay" : undefined}>
      <div className="detective-end detective-end--reveal">
        <button type="button" className="detective-reveal-skip" onClick={goToScore}>
          pular →
        </button>
        <div className="detective-reveal-scroll">
          {showCriaturaHeader && (
            <RevealActHeader title="As criaturas de Bucaré" variant="criatura" />
          )}
          {criaturaVisible > 0 && (
            <div className="detective-reveal-cards">
              {criaturaBots.slice(0, criaturaVisible).map((b, i) => {
                const actual = room.revealedRoles?.[b.id!] ?? "";
                return (
                  <RevealCharacterCard
                    key={b.id}
                    bot={b}
                    playerId={playerId}
                    actual={actual}
                    guess={getGuess(b.id!)}
                    animateIn={i === criaturaVisible - 1 && revealMachine.step === "criatura-cards"}
                  />
                );
              })}
            </div>
          )}
          {showMoradorHeader && (
            <RevealActHeader title="Os moradores de Bucaré" variant="morador" />
          )}
          {moradorVisible > 0 && (
            <div className="detective-reveal-cards">
              {moradorBots.slice(0, moradorVisible).map((b, i) => {
                const actual = room.revealedRoles?.[b.id!] ?? "";
                return (
                  <RevealCharacterCard
                    key={b.id}
                    bot={b}
                    playerId={playerId}
                    actual={actual}
                    guess={getGuess(b.id!)}
                    animateIn={i === moradorVisible - 1 && revealMachine.step === "morador-cards"}
                  />
                );
              })}
            </div>
          )}
          {showContinue && (
            <button
              type="button"
              className="primary-btn detective-reveal-continue"
              onClick={goToScore}
            >
              <span className="btn-title">Ver meu resultado →</span>
            </button>
          )}
        </div>
      </div>
      </div>
    );
  }

  const score = room.detectiveScore;
  const rank = score?.rank ?? "NOVATO";
  const detectiveName = myPlayer?.name?.trim() || "Anônimo";
  const showNoNet =
    rank === "LENDA" && room.soloModeDifficulty === "investigation";
  const locationHistory = (myPlayer?.locationHistory ?? []) as LocationHistoryEntry[];

  const criaturaTotal = criaturaBots.length;
  const moradorTotal = moradorBots.length;
  const elimCause = room.detectiveEliminationCause;
  const elimRound = room.detectiveGhostObservationRound ?? room.round ?? 1;
  const elimStamp =
    elimCause === "vote"
      ? "EXPULSO(A) PELA CIDADE"
      : room.detectiveEliminatedAt != null
        ? "INVESTIGAÇÃO INTERROMPIDA"
        : null;

  return (
    <div className={overlayActive ? "detective-end-overlay" : undefined}>
    <div className="detective-end detective-end--score score-screen">
      <article className="folhetim-clipping" aria-label="Relatório de investigação">
        <header className="folhetim-clipping__masthead">
          <hr className="folhetim-clipping__masthead-rule" aria-hidden />
          <h1 className="folhetim-clipping__title">Folhetim de Bucaré</h1>
          <p className="folhetim-clipping__edition">Edição da Madrugada</p>
          <hr className="folhetim-clipping__masthead-rule" aria-hidden />
          <p className="folhetim-clipping__stamp">Relatório de investigação especial</p>
        </header>

        <div className="folhetim-clipping__headline">
          <p className="folhetim-clipping__headline-lead">
            Detetive {detectiveName} encerra investigação como
          </p>
          <div className="folhetim-clipping__rank-wrap">
            <p className="folhetim-clipping__rank">{rank}</p>
            {rank === "LENDA" && <span className="folhetim-clipping__recorde">Recorde</span>}
          </div>
          {elimStamp && (
            <div className="folhetim-clipping__elim-stamp-wrap">
              <span className="folhetim-clipping__elim-stamp">{elimStamp}</span>
              <p className="folhetim-clipping__elim-round">
                A rodada {elimRound} foi a última desta investigação.
              </p>
            </div>
          )}
        </div>

        <div className="folhetim-clipping__body">
          <div className="folhetim-clipping__columns">
            <p className="folhetim-clipping__narrative">{RANK_NARRATIVE[rank](detectiveName)}</p>
            {score && (
              <div className="folhetim-clipping__scorebox">
                <p className="folhetim-clipping__scorebox-title">Placar</p>
                <div className="folhetim-clipping__scorebox-row">
                  <span>Criaturas</span>
                  <span>
                    {score.criaturaCorrect}/{criaturaTotal}
                  </span>
                </div>
                <div className="folhetim-clipping__scorebox-row">
                  <span>Moradores</span>
                  <span>
                    {score.moradorCorrect}/{moradorTotal}
                  </span>
                </div>
                <div className="folhetim-clipping__scorebox-row folhetim-clipping__scorebox-total">
                  <span>Total</span>
                  <span>
                    {score.correct}/{score.total}
                  </span>
                </div>
              </div>
            )}
          </div>

          {locationHistory.length > 0 && (
            <section className="folhetim-clipping__rondas">
              <h2 className="folhetim-clipping__rondas-title">Rondas desta noite</h2>
              <ul className="folhetim-clipping__rondas-list">
                {[...locationHistory]
                  .sort((a, b) => a.round - b.round)
                  .map((e, i) => (
                    <li key={`${e.round}-${e.location}-${i}`}>
                      Rodada {e.round} — {LOCATION_LABEL_PT[e.location as keyof typeof LOCATION_LABEL_PT]}:{" "}
                      {locationVisitResultShortPt(e.result as LocationVisitResultKind)}
                    </li>
                  ))}
              </ul>
            </section>
          )}

          {showNoNet && (
            <p className="folhetim-clipping__no-net">Lenda sem rede — você não precisou de ajuda.</p>
          )}

          <footer className="folhetim-clipping__footer">
            Bucaré, {formatClippingDate()} · Edição N.º {room.round ?? 1}
          </footer>
        </div>
      </article>

      <div className="detective-score-actions">
        <button type="button" className="detective-score-btn detective-score-btn--primary" onClick={onPlayAgain}>
          Jogar de novo →
        </button>
        {isAnonymous && (
          <p className="detective-score-anon">Crie uma conta para salvar seu progresso.</p>
        )}
        <button type="button" className="detective-score-btn detective-score-btn--secondary" onClick={onChronicle}>
          Ver crônica completa
        </button>
        <button type="button" className="detective-score-btn detective-score-btn--tertiary" onClick={onChangeMode}>
          Mudar dificuldade
        </button>
      </div>
    </div>
    </div>
  );
}
