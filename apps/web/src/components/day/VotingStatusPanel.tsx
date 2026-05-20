import type { PlayerDoc } from "../../types.js";

export type VotingStatusPanelProps = {
  eligibleVoters: PlayerDoc[];
  dayRoundVotes: Record<string, string | null>;
  compact?: boolean;
};

export function VotingStatusPanel({
  eligibleVoters,
  dayRoundVotes,
  compact = false,
}: VotingStatusPanelProps) {
  if (eligibleVoters.length === 0) return null;

  const votedCount = eligibleVoters.filter((p) =>
    Object.hasOwn(dayRoundVotes, p.id ?? ""),
  ).length;

  return (
    <section
      className={`voto-registro${compact ? " voto-registro--compact" : ""}`}
      aria-label="Registro de votos da praça"
    >
      <p className="voto-registro__titulo">
        Registro da votação · {votedCount}/{eligibleVoters.length}
      </p>
    </section>
  );
}
