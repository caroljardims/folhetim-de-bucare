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
      <ul className="voto-registro__lista">
        {eligibleVoters.map((p) => {
          const id = p.id ?? "";
          const voted = Object.hasOwn(dayRoundVotes, id);
          return (
            <li
              key={id || p.name}
              className={`voto-registro__item${voted ? " voto-registro__item--ok" : " voto-registro__item--pend"}`}
            >
              <span className="voto-registro__nome">{p.name ?? "?"}</span>
              <span className="voto-registro__estado">{voted ? "votou" : "pendente"}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
