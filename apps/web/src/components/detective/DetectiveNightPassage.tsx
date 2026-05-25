import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { BtnSpinner } from "../BtnSpinner.js";
import { DetectiveNightSilhouette, type SilhouetteId } from "./DetectiveNightSilhouettes.js";
import "./DetectiveNightPassage.css";

type Props = {
  round: number;
  onContinue: () => void;
  sent: boolean;
  disabled: boolean;
  busy: boolean;
};

const SILHOUETTE_DEFS: Array<{
  id: SilhouetteId;
  duration: number;
  yOffset: number;
  direction: "ltr" | "rtl";
}> = [
  { id: "lobisomem", duration: 10000, yOffset: -20, direction: "ltr" },
  { id: "saci", duration: 8000, yOffset: 30, direction: "rtl" },
  { id: "iara", duration: 12000, yOffset: 60, direction: "ltr" },
  { id: "mula", duration: 6000, yOffset: 10, direction: "ltr" },
];

const STARS = [
  { left: "14%", top: "12%", opacity: 0.55, duration: 2.8, delay: 1.0 },
  { left: "28%", top: "8%", opacity: 0.45, duration: 3.5, delay: 1.2 },
  { left: "62%", top: "10%", opacity: 0.7, duration: 4.2, delay: 1.4 },
  { left: "78%", top: "16%", opacity: 0.5, duration: 2.4, delay: 1.6 },
  { left: "48%", top: "6%", opacity: 0.65, duration: 3.1, delay: 1.8 },
] as const;

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

function useMobileParticles(): number {
  const [count, setCount] = useState(24);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setCount(mq.matches ? 12 : 24);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return count;
}

function pickNextSilhouette(lastId: SilhouetteId | null) {
  const pool = lastId ? SILHOUETTE_DEFS.filter((s) => s.id !== lastId) : SILHOUETTE_DEFS;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

function leadLines(round: number): string[] {
  if (round <= 1) {
    return ["Bucaré adormece.", "Os passos ecoam nas ruas vazias."];
  }
  return [`A noite ${round} cai sobre Bucaré.`, "O folclore ronda em silêncio."];
}

function wordOffsetBefore(lines: string[], lineIndex: number): number {
  let n = 0;
  for (let i = 0; i < lineIndex; i++) {
    n += lines[i]!.split(/\s+/).length;
  }
  return n;
}

export function DetectiveNightPassage({ round, onContinue, sent, disabled, busy }: Props) {
  const reducedMotion = useReducedMotion();
  const particleCount = useMobileParticles();
  const lastSilhouetteRef = useRef<SilhouetteId | null>(null);
  const scheduleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearSilhouetteRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeSilhouette, setActiveSilhouette] = useState<(typeof SILHOUETTE_DEFS)[number] | null>(
    null,
  );

  const lines = useMemo(() => leadLines(round), [round]);

  const particles = useMemo(
    () =>
      Array.from({ length: particleCount }, (_, i) => ({
        id: i,
        size: 1 + Math.random() * 1.5,
        opacity: 0.08 + Math.random() * 0.17,
        left: `${8 + Math.random() * 84}%`,
        bottom: `${5 + Math.random() * 70}%`,
        duration: 18 + Math.random() * 28,
        delay: -Math.random() * 24,
      })),
    [particleCount],
  );

  useEffect(() => {
    if (reducedMotion) return;

    const scheduleNext = (delayMs: number) => {
      scheduleRef.current = setTimeout(() => {
        const next = pickNextSilhouette(lastSilhouetteRef.current);
        lastSilhouetteRef.current = next.id;
        setActiveSilhouette(next);
        clearSilhouetteRef.current = setTimeout(() => {
          setActiveSilhouette(null);
          scheduleNext(15000 + Math.random() * 10000);
        }, next.duration);
      }, delayMs);
    };

    scheduleNext(8000 + Math.random() * 4000);

    return () => {
      if (scheduleRef.current) clearTimeout(scheduleRef.current);
      if (clearSilhouetteRef.current) clearTimeout(clearSilhouetteRef.current);
      setActiveSilhouette(null);
    };
  }, [reducedMotion]);

  const animateIn = !reducedMotion;

  return (
    <div
      className={`detective-night-passage${animateIn ? " detective-night-passage--animate-in" : ""}`}
      aria-live="polite"
    >
      <div className="detective-night-passage__atmosphere" aria-hidden>
        {!reducedMotion && (
          <div className="detective-night-passage__particles">
            {particles.map((p) => (
              <span
                key={p.id}
                className="detective-night-passage__particle"
                style={
                  {
                    "--dust-size": `${p.size}px`,
                    "--dust-opacity": String(p.opacity),
                    left: p.left,
                    bottom: p.bottom,
                    animationDuration: `${p.duration}s`,
                    animationDelay: `${p.delay}s`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
        )}

        {!reducedMotion && activeSilhouette && (
          <div
            key={activeSilhouette.id}
            className={`detective-night-passage__silhouette detective-night-passage__silhouette--${activeSilhouette.id} detective-night-passage__silhouette--${activeSilhouette.direction}`}
            style={
              {
                "--silhouette-duration": `${activeSilhouette.duration}ms`,
                "--silhouette-y": `${activeSilhouette.yOffset}px`,
              } as CSSProperties
            }
          >
            <DetectiveNightSilhouette id={activeSilhouette.id} />
          </div>
        )}
      </div>

      <div className="detective-night-passage__content">
        <div className="detective-night-passage__celestial" aria-hidden>
          {STARS.map((star, i) => (
            <span
              key={i}
              className="detective-night-passage__star"
              style={
                {
                  left: star.left,
                  top: star.top,
                  "--star-opacity": String(star.opacity),
                  animationDuration: `${star.duration}s`,
                  animationDelay: `${star.delay}s`,
                } as CSSProperties
              }
            />
          ))}
          <span className="detective-night-passage__moon moon">☾</span>
        </div>

        <p className="detective-night-passage__lead">
          {lines.map((line, lineIndex) => (
            <span key={lineIndex} className="detective-night-passage__lead-line">
              {line.split(/\s+/).map((word, wi, parts) => (
                <span
                  key={wi}
                  className="detective-night-passage__word"
                  style={{
                    animationDelay: `${1800 + (wordOffsetBefore(lines, lineIndex) + wi) * 80}ms`,
                  }}
                >
                  {word}
                  {wi < parts.length - 1 ? "\u00a0" : ""}
                </span>
              ))}
              {lineIndex < lines.length - 1 ? <br /> : null}
            </span>
          ))}
        </p>

        <p
          className="detective-night-passage__hint muted"
          style={animateIn ? { animationDelay: "2600ms" } : undefined}
        >
          Suas pistas do caderno serão atualizadas ao amanhecer.
        </p>

        <button
          type="button"
          className="primary-btn detective-night-passage__cta"
          style={animateIn ? { animationDelay: "3200ms" } : undefined}
          disabled={disabled || sent || busy}
          onClick={onContinue}
        >
          <span className="btn-title btn-title-row">
            {sent ? "✓ Indo para o amanhecer…" : busy ? "aguarda…" : "Seguir para o amanhecer →"}
            <BtnSpinner show={busy && !sent} />
          </span>
        </button>
      </div>
    </div>
  );
}
