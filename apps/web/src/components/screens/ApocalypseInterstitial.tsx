import { useEffect, useState } from "react";

type Props = {
  message: string;
  onDone: () => void;
};

const DISPLAY_MS = 3000;

export function ApocalypseInterstitial({ message, onDone }: Props) {
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
    <div className="apocalypse-interstitial" role="dialog" aria-modal="true" aria-label="Apocalipse Robô">
      <div className="apocalypse-interstitial__inner">
        <p className="apocalypse-interstitial__label">Apocalipse Robô</p>
        <p className="apocalypse-interstitial__text">{message}</p>
      </div>
    </div>
  );
}
