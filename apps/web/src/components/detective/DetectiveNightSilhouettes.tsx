/** Silhuetas do folclore — SVG inline, sem fetch. */

export type SilhouetteId = "lobisomem" | "saci" | "iara" | "mula";

type Props = {
  id: SilhouetteId;
  className?: string;
};

export function DetectiveNightSilhouette({ id, className }: Props) {
  const common = {
    className,
    viewBox: "0 0 120 80",
    fill: "#000",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true as const,
  };

  switch (id) {
    case "lobisomem":
      return (
        <svg {...common}>
          <path d="M28 68 L32 52 L26 44 L30 28 L38 18 L52 14 L68 16 L78 24 L82 34 L88 38 L92 52 L86 68 L72 72 L48 72 Z" />
          <path d="M40 32 L44 26 L50 30 L46 36 Z" />
          <path d="M68 30 L72 24 L78 28 L74 34 Z" />
          <path d="M52 20 L56 8 L62 12 L58 22 Z" />
          <path d="M22 48 L14 42 L18 36 L26 40 Z" />
          <path d="M94 46 L102 40 L98 34 L90 38 Z" />
        </svg>
      );
    case "saci":
      return (
        <svg {...common} viewBox="0 0 64 72">
          <path d="M28 64 L32 48 L30 36 L34 28 L40 22 L48 20 L52 28 L50 40 L48 52 L44 64 Z" />
          <circle cx="44" cy="18" r="8" />
          <path d="M34 64 L38 64 L36 52 Z" />
        </svg>
      );
    case "iara":
      return (
        <svg {...common} viewBox="0 0 140 56">
          <path d="M20 48 Q40 44 60 46 Q80 48 100 44 Q120 40 130 46 L128 52 Q100 56 70 54 Q40 52 18 54 Z" />
          <path d="M48 46 Q52 20 58 8 Q64 18 68 46 Q72 24 78 12 Q84 28 88 46 Q92 16 98 6 Q104 22 108 44 Q112 18 118 10 Q122 32 124 46" />
        </svg>
      );
    case "mula":
      return (
        <svg {...common} viewBox="0 0 160 64">
          <path d="M12 44 L28 40 L36 28 L52 26 L68 30 L84 28 L100 32 L116 30 L132 34 L148 38 L152 48 L140 52 L120 50 L100 52 L80 50 L60 52 L40 50 L20 52 Z" />
          <path d="M28 40 L24 52 L20 56 L32 54 Z" />
          <path d="M132 38 L136 50 L140 54 L128 52 Z" />
        </svg>
      );
    default:
      return null;
  }
}
