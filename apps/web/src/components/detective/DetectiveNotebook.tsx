import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import type { EvidenceEntry, EvidenceWeight, PlayerDoc, RoomDoc, SoloModeDifficulty } from "../../types.js";
import { ROLE_DISPLAY } from "../../lib/roleStories.js";
import { writeDetectiveTheory, readDetectiveTheories } from "../../lib/detectiveTheories.js";
import { stablePlayerGlyph } from "../../lib/playerGlyph.js";
import { useFirebaseServices } from "../../context/FirebaseServicesContext.js";
import {
  LOCATION_LABEL_PT,
  locationVisitResultShortPt,
  type LocationVisitResultKind,
} from "../../lib/detectiveLocations.js";
import type { LocationHistoryEntry } from "../../types.js";
import "./DetectiveNotebook.css";

const GUESSABLE_ROLES = Object.keys(ROLE_DISPLAY).filter((r) => r !== "detetive");

function WeightIcon({ weight, dot = false }: { weight: EvidenceWeight | string; dot?: boolean }) {
  const cls = `caderno-weight caderno-weight--${weight}${dot ? " caderno-weight--dot" : ""}`;
  if (weight === "forte") {
    return (
      <span className={cls} aria-label="forte">
        !
      </span>
    );
  }
  if (weight === "moderado") {
    return (
      <span className={cls} aria-hidden>
        ◐
      </span>
    );
  }
  return <span className={cls} aria-hidden />;
}

function mapResultClass(result: string): string {
  const label = locationVisitResultShortPt(result as LocationVisitResultKind);
  if (label === "movimento suspeito") return "caderno-mapa__result--alert";
  if (label === "ocupado") return "caderno-mapa__result--normal";
  return "caderno-mapa__result--muted";
}

function SuspectCard({
  bot,
  roomCode,
  playerId,
  selfGlyph,
  mode,
  currentRound,
  evidence,
  manualNote,
  revealedRole,
  onNoteBlur,
}: {
  bot: PlayerDoc;
  roomCode: string;
  playerId: string;
  selfGlyph: string;
  mode: SoloModeDifficulty;
  currentRound: number;
  evidence: EvidenceEntry[];
  manualNote: string;
  revealedRole?: string;
  onNoteBlur: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [theory, setTheory] = useState(() => readDetectiveTheories(roomCode)[bot.id!] ?? "unknown");
  const [noteLocal, setNoteLocal] = useState(manualNote);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const glyph = stablePlayerGlyph(bot.id!, playerId, selfGlyph);
  const expelled = Boolean(revealedRole);

  useEffect(() => {
    setNoteLocal(manualNote);
  }, [manualNote]);

  useEffect(() => {
    const el = notesRef.current;
    if (!el || mode !== "investigation") return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [noteLocal, open, mode]);

  const onTheory = (v: string) => {
    setTheory(v);
    writeDetectiveTheory(roomCode, bot.id!, v);
  };

  return (
    <article className={`caderno-suspect${open ? " caderno-suspect--open" : ""}${expelled ? " caderno-suspect--expelled" : ""}`}>
      {expelled && <span className="caderno-stamp caderno-stamp--revealed">REVELADO</span>}
      <button type="button" className="caderno-suspect__head" onClick={() => setOpen((o) => !o)}>
        <span className="caderno-suspect__glyph" aria-hidden>
          {glyph}
        </span>
        <span className="caderno-suspect__name-block">
          <span className="caderno-suspect__name">{bot.name}</span>
          {expelled && revealedRole && (
            <span className="caderno-suspect__identity">{ROLE_DISPLAY[revealedRole] ?? revealedRole}</span>
          )}
        </span>
        <span className="caderno-suspect__meta">
          {mode === "story" && evidence.length > 0 && (
            <>
              <span className="caderno-suspect__dots" aria-hidden>
                {evidence.slice(0, 8).map((ev) => (
                  <WeightIcon key={ev.id} weight={ev.weight} dot />
                ))}
              </span>
              <span className="caderno-suspect__pista-count">
                {evidence.length} pista{evidence.length !== 1 ? "s" : ""}
              </span>
            </>
          )}
          <span className="caderno-suspect__chev" aria-hidden>
            {open ? "▲" : "▼"}
          </span>
        </span>
      </button>
      <div className="caderno-suspect__body-outer">
        <div className="caderno-suspect__body-inner">
          <div className="caderno-suspect__body">
            {mode === "story" &&
              evidence.map((ev) => (
                <div
                  key={ev.id}
                  className={`caderno-evidence${ev.round === currentRound ? " caderno-evidence--new" : ""}`}
                >
                  <div className="caderno-evidence__head">
                    <span className="caderno-evidence__round">R{ev.round}</span>
                    <WeightIcon weight={ev.weight} />
                    <span className="caderno-evidence__weight-label">{ev.weight}</span>
                  </div>
                  <p className="caderno-evidence__desc">{ev.description}</p>
                </div>
              ))}
            {mode === "investigation" && !expelled && (
              <textarea
                ref={notesRef}
                className="caderno-notes"
                placeholder="anote suas observações..."
                value={noteLocal}
                rows={4}
                onChange={(e) => setNoteLocal(e.target.value)}
                onBlur={() => onNoteBlur(noteLocal)}
              />
            )}
            {!expelled && (
              <div className="caderno-theory">
                <span className="caderno-stamp caderno-stamp--theory">MINHA TEORIA</span>
                <select
                  className="caderno-theory__select"
                  value={theory}
                  onChange={(e) => onTheory(e.target.value)}
                  aria-label={`Teoria sobre ${bot.name}`}
                >
                  <option value="unknown">ainda não sei...</option>
                  {GUESSABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_DISPLAY[r] ?? r}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

type Props = {
  room: RoomDoc;
  roomCode: string;
  playerId: string;
  selfGlyph: string;
  players: PlayerDoc[];
  myPlayer?: PlayerDoc;
  currentRound: number;
  revealedRoles?: Record<string, string>;
};

export function DetectiveNotebook({
  room,
  roomCode,
  playerId,
  selfGlyph,
  players,
  myPlayer,
  currentRound,
  revealedRoles,
}: Props) {
  const { db } = useFirebaseServices();
  const [expanded, setExpanded] = useState(false);
  const mode = room.soloModeDifficulty ?? "story";
  const bots = useMemo(() => players.filter((p) => p.isBot), [players]);
  const evidenceLog = myPlayer?.evidenceLog ?? [];
  const locationHistory = (myPlayer?.locationHistory ?? []) as LocationHistoryEntry[];

  const pistaCount = evidenceLog.length;
  const suspectCount = bots.length;

  const saveNote = useCallback(
    async (botId: string, text: string) => {
      const ref = doc(db, "rooms", roomCode, "players", playerId);
      const prev = myPlayer?.manualNotes ?? {};
      await updateDoc(ref, { manualNotes: { ...prev, [botId]: text } });
    },
    [db, roomCode, playerId, myPlayer?.manualNotes],
  );

  const panel = (
    <div className={`caderno${expanded ? " caderno--expanded" : ""}`}>
      <div className="caderno__paper">
        <button type="button" className="caderno__bar" onClick={() => setExpanded((e) => !e)}>
          <span className="caderno-stamp caderno-stamp--title">CADERNO DE EVIDÊNCIAS</span>
          <span className="caderno__bar-summary">
            · {pistaCount} pista{pistaCount !== 1 ? "s" : ""} · {suspectCount} suspeito
            {suspectCount !== 1 ? "s" : ""}
          </span>
          <span className="caderno__bar-chev" aria-hidden>
            {expanded ? "▲" : "▼"}
          </span>
        </button>

        <div className="caderno__body-outer">
          <div className="caderno__body-inner">
            <div className="caderno__body-scroll">
              {pistaCount === 0 && mode === "story" && (
                <div className="caderno-empty">
                  <p>Nenhuma pista ainda.</p>
                  <p>A noite guarda seus segredos.</p>
                </div>
              )}

              {locationHistory.length > 0 && (
                <section className="caderno-mapa" aria-label="Mapa de Bucaré">
                  <span className="caderno-stamp caderno-stamp--blue">MAPA DE BUCARÉ</span>
                  <ul className="caderno-mapa__list">
                    {[...locationHistory]
                      .sort((a, b) => a.round - b.round)
                      .map((entry, i) => {
                        const resultLabel = locationVisitResultShortPt(
                          entry.result as LocationVisitResultKind,
                        );
                        const locLabel =
                          LOCATION_LABEL_PT[entry.location as keyof typeof LOCATION_LABEL_PT] ??
                          entry.location;
                        return (
                          <li key={`${entry.round}-${entry.location}-${i}`} className="caderno-mapa__item">
                            <span className="caderno-mapa__round">R{entry.round} — </span>
                            <span className="caderno-mapa__loc">
                              {locLabel}:{" "}
                              <span className={mapResultClass(entry.result)}>{resultLabel}</span>
                            </span>
                          </li>
                        );
                      })}
                  </ul>
                </section>
              )}

              <div className="caderno-suspects">
                {bots.map((b) => (
                  <SuspectCard
                    key={b.id}
                    bot={b}
                    roomCode={roomCode}
                    playerId={playerId}
                    selfGlyph={selfGlyph}
                    mode={mode}
                    currentRound={currentRound}
                    evidence={evidenceLog.filter((e) => e.targetId === b.id)}
                    manualNote={myPlayer?.manualNotes?.[b.id!] ?? ""}
                    revealedRole={
                      b.expelled || b.eliminated || !b.alive ? revealedRoles?.[b.id!] : undefined
                    }
                    onNoteBlur={(t) => void saveNote(b.id!, t).catch(console.error)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return <div className="caderno-wrap">{panel}</div>;
}
