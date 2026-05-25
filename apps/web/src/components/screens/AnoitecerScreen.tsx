import { useEffect, useMemo, useState } from "react";
import { FolhetimEdition } from "../FolhetimEdition.js";
import type { ChatMessage, PlayerDoc, PublicLogEntry, RoomDoc } from "../../types.js";
import { buildAnoitecerFolhetim, filterAnoitecerDayOutcomes } from "../../lib/anoitecerContent.js";
import { findLobisomemObjectiveR4Folhetim } from "../../lib/amanhecerContent.js";

export type AnoitecerScreenProps = {
  room: RoomDoc;
  publicLog: PublicLogEntry[];
  savedDayChat: ChatMessage[];
  prevDayVotes: Record<string, string | null>;
  players: PlayerDoc[];
  onDismiss: () => void;
};

export function AnoitecerScreen({
  room,
  publicLog,
  savedDayChat,
  prevDayVotes,
  players,
  onDismiss,
}: AnoitecerScreenProps) {
  const [showCta, setShowCta] = useState(false);
  const round = room.round ?? 1;
  const prevRound = round - 1;

  useEffect(() => {
    setShowCta(false);
    const t = window.setTimeout(() => setShowCta(true), 1800);
    return () => window.clearTimeout(t);
  }, [round]);

  const dayOutcomes = useMemo(
    () => filterAnoitecerDayOutcomes(publicLog, prevRound),
    [publicLog, prevRound],
  );

  const folhetim = useMemo(
    () => buildAnoitecerFolhetim(dayOutcomes, savedDayChat, prevDayVotes, players),
    [dayOutcomes, savedDayChat, prevDayVotes, players],
  );

  const lobisomemObjectiveFolhetim = useMemo(
    () => findLobisomemObjectiveR4Folhetim(publicLog, round),
    [publicLog, round],
  );

  const editionLabel = `N.º ${String((prevRound - 1) * 2 + 2).padStart(2, "0")}`;

  return (
    <div className="screen screen--noite">
      <header className="anoitecer-chrome">
        <p className="anoitecer-chrome__label">anoitecer · lua {round}</p>
        <div className="lua anoitecer-lua" aria-hidden>☾</div>
        <p className="eyebrow anoitecer-chrome__tagline">A praça fechou as portas</p>
      </header>

      {lobisomemObjectiveFolhetim ? (
        <FolhetimEdition
          round={round}
          folhetim={lobisomemObjectiveFolhetim}
          lead="— cordel da quarta lua —"
          editionLabel="Extra"
          ariaLabel="Folhetim de Bucaré — objetivo do Lobisomem"
          className="folhetim--lobisomem-r4"
        />
      ) : (
        <FolhetimEdition
          round={prevRound}
          folhetim={folhetim}
          lead="— edição do anoitecer —"
          editionLabel={editionLabel}
          ariaLabel="Folhetim de Bucaré — edição do anoitecer"
        />
      )}

      <footer className="amanhecer-footer">
        <button
          type="button"
          className={`btn-transicao amanhecer-cta${showCta ? " amanhecer-cta--visible" : ""}`}
          disabled={!showCta}
          onClick={onDismiss}
        >
          Entrar na noite →
        </button>
      </footer>
    </div>
  );
}
