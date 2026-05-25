import { BtnSpinner } from "../BtnSpinner.js";
import { ALL_BUCARE_LOCATIONS, LOCATION_LABEL_PT, type BucareLocation } from "../../lib/detectiveLocations.js";

type Props = {
  selected: BucareLocation | "";
  onSelect: (loc: BucareLocation) => void;
  onSubmit: () => void;
  sent: boolean;
  disabled: boolean;
  busy: boolean;
};

export function DetectiveLocationNight({
  selected,
  onSelect,
  onSubmit,
  sent,
  disabled,
  busy,
}: Props) {
  return (
    <div className="detective-location-night">
      <p className="detective-location-night__title">Onde você vai investigar esta noite?</p>
      <p className="detective-location-night__subtitle muted">
        Escolha um lugar em Bucaré para rondar.
      </p>
      <div className="detective-location-grid" role="listbox" aria-label="Lugares de Bucaré">
        {ALL_BUCARE_LOCATIONS.map((loc) => {
          const active = selected === loc;
          return (
            <button
              key={loc}
              type="button"
              role="option"
              aria-selected={active}
              className={`detective-location-card${active ? " detective-location-card--selected" : ""}`}
              disabled={disabled || sent}
              onClick={() => onSelect(loc)}
            >
              <span className="detective-location-card__name">{LOCATION_LABEL_PT[loc]}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="primary-btn detective-location-night__cta"
        disabled={disabled || sent || !selected || busy}
        onClick={onSubmit}
      >
        <span className="btn-title-row">
          {sent ? "✓ Ronda registrada" : busy ? "enviando…" : "Investigar"}
          <BtnSpinner show={busy && !sent} />
        </span>
      </button>
    </div>
  );
}
