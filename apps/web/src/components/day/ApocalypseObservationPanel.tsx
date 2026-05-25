import { useEffect, useMemo, useState } from "react";
import type { RoomDoc } from "../../types.js";
import { apocalypseObservationRemainingMs } from "../../lib/apocalypseRobo.js";
import { BtnSpinner } from "../BtnSpinner.js";

type Props = {
  room: RoomDoc;
  roomCode: string;
  run: (fnName: string, data: Record<string, unknown>, pendingKey?: string) => Promise<Record<string, unknown>>;
  busy: (key: string) => boolean;
};

export function ApocalypseObservationPanel({ room, roomCode, run, busy }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const remainingMs = useMemo(
    () => apocalypseObservationRemainingMs(room, now),
    [room, now],
  );
  const remainingSec = Math.ceil(remainingMs / 1000);
  const progress = 1 - remainingMs / 60_000;

  useEffect(() => {
    if (remainingMs > 0) return;
    void run("completeApocalypseRobo", { roomCode }, "apocalypseEnd").catch(() => {});
  }, [remainingMs, roomCode, run]);

  return (
    <section className="apocalypse-observe" aria-live="polite">
      <p className="apocalypse-observe__eyebrow">Você não está mais entre os vivos.</p>
      <p className="apocalypse-observe__lead">Observe o que resta de Bucaré.</p>
      <div className="apocalypse-observe__card">
        <span className="apocalypse-observe__icon" aria-hidden>
          🤖
        </span>
        <p className="apocalypse-observe__title">Os robôs tomaram Bucaré.</p>
        <p className="apocalypse-observe__copy">Você observa do além.</p>
        <div className="apocalypse-observe__timer" aria-hidden>
          <div className="apocalypse-observe__timer-bar" style={{ transform: `scaleX(${progress})` }} />
        </div>
        <p className="apocalypse-observe__countdown">
          A partida encerra em {remainingSec}s
        </p>
        <button
          type="button"
          className="ghost-btn apocalypse-observe__cta"
          disabled={busy("apocalypseEnd")}
          onClick={() => void run("completeApocalypseRobo", { roomCode }, "apocalypseEnd")}
        >
          <span className="btn-with-spinner">
            {busy("apocalypseEnd") ? "encerrando…" : "Encerrar partida →"}
            <BtnSpinner show={busy("apocalypseEnd")} />
          </span>
        </button>
      </div>
    </section>
  );
}
