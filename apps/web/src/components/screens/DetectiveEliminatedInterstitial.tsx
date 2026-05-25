import { useEffect, useState } from "react";

type Props = {
  lead: string;
  body: string;
  onDone: () => void;
};

const DISPLAY_MS = 3000;

export function DetectiveEliminatedInterstitial({ lead, body, onDone }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setVisible(false);
      onDone();
    }, DISPLAY_MS);
    return () => window.clearTimeout(id);
  }, [onDone]);

  if (!visible) return null;

  return (
    <div
      className="apocalypse-interstitial detective-elim-interstitial"
      role="dialog"
      aria-modal="true"
      aria-label="Fim da investigação"
    >
      <div className="apocalypse-interstitial__inner">
        <p className="apocalypse-interstitial__label">Fim da investigação</p>
        <p className="apocalypse-interstitial__text detective-elim-interstitial__lead">{lead}</p>
        <p className="apocalypse-interstitial__text detective-elim-interstitial__body">{body}</p>
      </div>
    </div>
  );
}
