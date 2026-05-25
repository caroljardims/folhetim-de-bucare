import { BtnSpinner } from "../BtnSpinner.js";
import "./detectiveFlow.css";

type Props = {
  onSubmit: () => void;
  sent: boolean;
  disabled: boolean;
  busy: boolean;
};

export function DetectiveRecognitionNight({ onSubmit, sent, disabled, busy }: Props) {
  return (
    <div className="detective-recognition-night">
      <h2 className="detective-recognition-night__title">Sua primeira noite em Bucaré</h2>
      <p className="detective-recognition-night__subtitle">
        Antes de investigar, você precisa conhecer a cidade. Caminhe pelas ruas. Observe.
      </p>
      <button
        type="button"
        className="primary-btn detective-recognition-night__cta"
        disabled={disabled || sent || busy}
        onClick={onSubmit}
      >
        <span className="btn-title btn-title-row">
          {sent ? "✓ Ronda registrada" : busy ? "enviando…" : "Começar a rondar →"}
          <BtnSpinner show={busy && !sent} />
        </span>
      </button>
    </div>
  );
}
