import { useMemo, useState, type ReactNode } from "react";
import { ROLE_SIDE, displayRoleName, type RoleId } from "folclore-game-engine";
import type { DetectiveRank, PlayerDoc, RoomDoc } from "../../types.js";
import { ROLE_DISPLAY } from "../../lib/roleStories.js";
import { readDetectiveTheories } from "../../lib/detectiveTheories.js";
import {
  detectiveSpecialEditionHeadline,
  detectiveSpecialEditionSummary,
} from "../../lib/detectiveSpecialEdition.js";
import {
  LOCATION_LABEL_PT,
  locationVisitResultShortPt,
  type LocationVisitResultKind,
} from "../../lib/detectiveLocations.js";
import type { LocationHistoryEntry } from "../../types.js";
import { stablePlayerGlyph } from "../../lib/playerGlyph.js";
import "./DetectiveNotebook.css";
import "./DetectiveEndFlow.css";

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
  forcedPhase?: "reveal" | "score";
  orchestrated?: boolean;
};

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

function formatCadernoStampDate(): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());
}

function guessLabel(guess: string): string {
  if (!guess || guess === "unknown") return "ainda não sei…";
  return ROLE_DISPLAY[guess] ?? displayRoleName(guess as RoleId);
}

function FolhetimScoreBox({
  score,
  criaturaTotal,
  moradorTotal,
}: {
  score: { criaturaCorrect: number; moradorCorrect: number; correct: number; total: number };
  criaturaTotal: number;
  moradorTotal: number;
}) {
  return (
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
  );
}

function CadernoConclusions({
  detectiveName,
  room,
  playerId,
  criaturaBots,
  moradorBots,
  getGuess,
}: {
  detectiveName: string;
  room: RoomDoc;
  playerId: string;
  criaturaBots: PlayerDoc[];
  moradorBots: PlayerDoc[];
  getGuess: (botId: string) => string;
}) {
  const renderRow = (bot: PlayerDoc) => {
    const actual = room.revealedRoles?.[bot.id!] ?? "";
    const guess = getGuess(bot.id!);
    const verdict = guessVerdict(guess, actual);
    const roleName = displayRoleName(actual as RoleId);

    return (
      <li key={bot.id} className="caderno-close__row">
        <div className="caderno-close__row-main">
          <div className="caderno-close__who">
            <span className="caderno-close__glyph" aria-hidden>
              {stablePlayerGlyph(bot.id!, playerId, "🔍")}
            </span>
            <span className="caderno-close__name">{bot.name}</span>
          </div>
          <span className="caderno-close__truth">{roleName}</span>
        </div>
        <div className="caderno-close__row-sub">
          <span className="caderno-close__theory">sua teoria: {guessLabel(guess)}</span>
          <span className={`caderno-close__stamp caderno-close__stamp--${verdict}`}>
            {verdict === "correct" && "✓ CORRETO"}
            {verdict === "wrong" && "✗ ERRADO"}
            {verdict === "unknown" && "? NÃO SOUBE"}
          </span>
        </div>
      </li>
    );
  };

  return (
    <div className="caderno-close-wrap">
      <div className="caderno caderno--close">
        <div className="caderno__paper">
          <div className="caderno-close__scroll">
            <header className="caderno-close__header">
              <hr className="caderno-close__rule" aria-hidden />
              <span className="caderno-stamp caderno-stamp--verified">CONCLUSÕES VERIFICADAS</span>
              <p className="caderno-close__meta">
                Detetive {detectiveName} · {formatCadernoStampDate()}
              </p>
              <hr className="caderno-close__rule" aria-hidden />
            </header>

            <section className="caderno-close__section" aria-label="Criaturas">
              <h2 className="caderno-close__section-title">— AS CRIATURAS —</h2>
              <ul className="caderno-close__list">{criaturaBots.map(renderRow)}</ul>
            </section>

            <section className="caderno-close__section" aria-label="Moradores">
              <h2 className="caderno-close__section-title">— OS MORADORES —</h2>
              <ul className="caderno-close__list">{moradorBots.map(renderRow)}</ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DetectiveEndFlow({
  room,
  roomCode,
  players,
  playerId,
  myPlayer,
  run: _run,
  busy: _busy,
  onPlayAgain,
  onChangeMode,
  onChronicle,
  isAnonymous,
  forcedPhase,
  orchestrated = false,
}: Props) {
  const bots = useMemo(
    () => players.filter((p) => p.isBot && p.id),
    [players],
  );
  const displayPhase =
    forcedPhase ??
    (room.detectivePhase === "reveal" ||
    (room.detectiveScore != null && room.detectivePhase !== "score")
      ? "reveal"
      : "score");

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

  const getGuess = (botId: string) =>
    room.detectiveGuesses?.[botId] ??
    readDetectiveTheories(roomCode)[botId] ??
    "unknown";

  const score = room.detectiveScore;
  const rank = (score?.rank ?? "NOVATO") as DetectiveRank;
  const detectiveName = myPlayer?.name?.trim() || "Anônimo";
  const criaturaTotal = criaturaBots.length;
  const moradorTotal = moradorBots.length;
  const showNoNet = rank === "LENDA" && room.soloModeDifficulty === "investigation";
  const locationHistory = (myPlayer?.locationHistory ?? []) as LocationHistoryEntry[];
  const reconChronicleLines = useMemo(() => {
    const recon = (myPlayer?.evidenceLog ?? []).filter((e) => e.type === "reconhecimento_noturno");
    if (recon.length === 0) return [];
    const lines = [`Noite 1 — Reconhecimento: ${recon.length} locais visitados`];
    for (const e of recon) {
      const locKey = e.location as keyof typeof LOCATION_LABEL_PT | undefined;
      const loc = locKey && LOCATION_LABEL_PT[locKey] ? LOCATION_LABEL_PT[locKey] : e.location ?? "?";
      const snippet = String(e.description ?? "").slice(0, 100);
      lines.push(`  · ${loc}: ${snippet}${snippet.length >= 100 ? "…" : ""}`);
    }
    return lines;
  }, [myPlayer?.evidenceLog]);
  const elimCause = room.detectiveEliminationCause;
  const elimRound = room.detectiveGhostObservationRound ?? room.round ?? 1;
  const elimStamp =
    elimCause === "vote"
      ? "EXPULSO(A) PELA CIDADE"
      : room.detectiveEliminatedAt != null
        ? "INVESTIGAÇÃO INTERROMPIDA"
        : null;

  const overlayActive = !orchestrated && room.status !== "ended";
  const stageClass = orchestrated ? "detective-end-stage" : undefined;
  const wrap = (content: ReactNode) =>
    overlayActive ? (
      <div className="detective-end-overlay">{content}</div>
    ) : (
      content
    );

  if (displayPhase === "reveal") {
    return wrap(
      <div className={`detective-end detective-end--caderno-close${stageClass ? ` ${stageClass}` : ""}`}>
        <CadernoConclusions
          detectiveName={myPlayer?.name?.trim() || "Detetive"}
          room={room}
          playerId={playerId}
          criaturaBots={criaturaBots}
          moradorBots={moradorBots}
          getGuess={getGuess}
        />
      </div>,
    );
  }

  const cityHeadline = detectiveSpecialEditionHeadline(room);
  const editionSummary =
    score != null
      ? detectiveSpecialEditionSummary(detectiveName, score.correct, score.total)
      : null;

  if (!score) {
    return wrap(
      <div className={`detective-end detective-end--score${stageClass ? ` ${stageClass}` : ""}`}>
        <p className="solo-end-loading muted">Compilando o relatório…</p>
      </div>,
    );
  }

  return wrap(
    <div
      className={`detective-end detective-end--score score-screen${stageClass ? ` ${stageClass}` : ""}${orchestrated ? " detective-end--score-orchestrated" : ""}`}
    >
      <article className="folhetim-clipping" aria-label="Relatório de investigação">
        <header className="folhetim-clipping__report-header">
          <hr className="folhetim-clipping__report-header-rule" aria-hidden />
          <p className="folhetim-clipping__stamp folhetim-clipping__stamp--report">
            Relatório de investigação especial
          </p>
          <hr className="folhetim-clipping__report-header-rule" aria-hidden />
        </header>

        <h2 className="folhetim-clipping__city-headline">{cityHeadline}</h2>
        {editionSummary && (
          <p className="folhetim-clipping__detective-summary">{editionSummary}</p>
        )}

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
              <FolhetimScoreBox
                score={score}
                criaturaTotal={criaturaTotal}
                moradorTotal={moradorTotal}
              />
            )}
          </div>

          {(reconChronicleLines.length > 0 || locationHistory.length > 0) && (
            <section className="folhetim-clipping__rondas">
              <h2 className="folhetim-clipping__rondas-title">Rondas desta investigação</h2>
              <ul className="folhetim-clipping__rondas-list">
                {reconChronicleLines.map((line, i) => (
                  <li key={`recon-${i}`}>{line}</li>
                ))}
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

      {!orchestrated && (
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
      )}

      {orchestrated && isAnonymous && (
        <p className="detective-score-anon detective-score-anon--orchestrated">
          Crie uma conta para salvar seu progresso.
        </p>
      )}
    </div>,
  );
}
