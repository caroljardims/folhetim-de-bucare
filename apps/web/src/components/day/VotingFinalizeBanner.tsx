import { useCallback, useEffect, useState } from "react";
import type { RoomDoc } from "../../types.js";
import { expiresAtMs, hasPendingVotingFinalize } from "../../lib/votingFinalize.js";

export type VotingFinalizeBannerProps = {
  room: RoomDoc;
  onExpire: () => Promise<void>;
};

export function VotingFinalizeBanner({ room, onExpire }: VotingFinalizeBannerProps) {
  const pending = hasPendingVotingFinalize(room) ? room.pendingVotingFinalize : null;
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [expiredFired, setExpiredFired] = useState(false);

  const deadlineMs = pending ? expiresAtMs(pending.expiresAt) : 0;

  useEffect(() => {
    if (!pending) return;
    setExpiredFired(false);
  }, [pending, deadlineMs]);

  useEffect(() => {
    if (!pending) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
      setSecondsLeft(left);
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [pending, deadlineMs]);

  const fireExpire = useCallback(() => {
    if (expiredFired) return;
    setExpiredFired(true);
    void onExpire().catch(() => {
      setExpiredFired(false);
    });
  }, [expiredFired, onExpire]);

  useEffect(() => {
    if (!pending || secondsLeft > 0) return;
    fireExpire();
  }, [pending, secondsLeft, fireExpire]);

  if (!pending) return null;

  return (
    <div className="voto-finalizar-banner" role="status" aria-live="polite">
      <p className="voto-finalizar-banner__titulo">Apuração em andamento</p>
      <p className="voto-finalizar-banner__texto">
        O anfitrião convocou o fim da votação.{" "}
        <strong>{secondsLeft > 0 ? `${secondsLeft}s` : "agora"}</strong> para quem ainda não votou.
      </p>
    </div>
  );
}
