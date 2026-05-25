import { useEffect, useMemo, useState } from "react";
import type { RoomDoc } from "../../types.js";
import {
  soloGameEndRemainingMs,
  type DetectiveEliminationCause,
} from "../../lib/detectiveElimination.js";
import { BtnSpinner } from "../BtnSpinner.js";

type Props = {
  room: RoomDoc;
  roomCode: string;
  cause: DetectiveEliminationCause | undefined;
  run: (fnName: string, data: Record<string, unknown>, pendingKey?: string) => Promise<Record<string, unknown>>;
  busy: (key: string) => boolean;
};

export function DetectiveGhostObservationPanel({ room, roomCode, cause, run, busy }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const expelled = cause === "vote";

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const remainingMs = useMemo(() => soloGameEndRemainingMs(room, now), [room, now]);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const progress = 1 - remainingMs / 60_000;

  useEffect(() => {
    if (remainingMs > 0) return;
    void run("triggerDetectiveEndGameCallable", { roomCode }, "detectiveGhostEnd").catch(() => {});
  }, [remainingMs, roomCode, run]);

  return (
    <section className="apocalypse-observe detective-ghost-observe" aria-live="polite">
      <p className="apocalypse-observe__eyebrow">Você não está mais entre os vivos.</p>
      <p className="apocalypse-observe__lead">Observe o que a cidade fará sem você.</p>
      <div className="apocalypse-observe__card">
        <span className="apocalypse-observe__icon" aria-hidden>
          {expelled ? "🚪" : "🕯️"}
        </span>
        {expelled ? (
          <>
            <p className="apocalypse-observe__title">A cidade te expulsou.</p>
            <p className="apocalypse-observe__copy">
              Às vezes o folclore não precisa de garras — precisa de votos.
            </p>
            <p className="apocalypse-observe__copy apocalypse-observe__copy--sub">
              Observe o que decidem fazer sem sua presença.
            </p>
          </>
        ) : (
          <>
            <p className="apocalypse-observe__title">Sua investigação foi interrompida.</p>
            <p className="apocalypse-observe__copy">
              Bucaré não perdoa os que sabem demais — nem os que sabem de menos.
            </p>
            <p className="apocalypse-observe__copy apocalypse-observe__copy--sub">
              Observe o que a cidade fará sem você.
            </p>
          </>
        )}
        <div className="apocalypse-observe__timer" aria-hidden>
          <div className="apocalypse-observe__timer-bar" style={{ transform: `scaleX(${progress})` }} />
        </div>
        <p className="apocalypse-observe__countdown">
          A partida encerra em {remainingSec}s
        </p>
        <button
          type="button"
          className="ghost-btn apocalypse-observe__cta"
          disabled={busy("detectiveGhostEnd")}
          onClick={() =>
            void run("triggerDetectiveEndGameCallable", { roomCode }, "detectiveGhostEnd")
          }
        >
          <span className="btn-with-spinner">
            {busy("detectiveGhostEnd") ? "encerrando…" : "Encerrar investigação →"}
            <BtnSpinner show={busy("detectiveGhostEnd")} />
          </span>
        </button>
      </div>
    </section>
  );
}
