import { useCallback, useMemo, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import type { EvidenceEntry, PlayerDoc, RoomDoc, SoloModeDifficulty } from "../../types.js";
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

const GUESSABLE_ROLES = Object.keys(ROLE_DISPLAY).filter((r) => r !== "detetive");

const WEIGHT_ICON: Record<string, string> = {
  forte: "◆",
  moderado: "◈",
  leve: "◇",
};

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
  onNoteChange,
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
  onNoteChange: (text: string) => void;
}) {
  const [open, setOpen] = useState(!revealedRole);
  const [theory, setTheory] = useState(() => readDetectiveTheories(roomCode)[bot.id!] ?? "unknown");
  const glyph = stablePlayerGlyph(bot.id!, playerId, selfGlyph);

  const onTheory = (v: string) => {
    setTheory(v);
    writeDetectiveTheory(roomCode, bot.id!, v);
  };

  return (
    <div className={`detective-suspect-card${revealedRole ? " detective-suspect-card--expelled" : ""}`}>
      <button type="button" className="detective-suspect-card__head" onClick={() => setOpen((o) => !o)}>
        <span className="detective-suspect-card__glyph">{glyph}</span>
        <span className="detective-suspect-card__name">{bot.name}</span>
        {revealedRole && (
          <span className="detective-suspect-card__revealed">{ROLE_DISPLAY[revealedRole] ?? revealedRole}</span>
        )}
        <span className="detective-suspect-card__chev">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="detective-suspect-card__body">
          {mode === "story" &&
            evidence.map((ev) => (
              <p
                key={ev.id}
                className={`detective-evidence-line${ev.round === currentRound ? " detective-evidence-line--new" : ""}`}
              >
                <span className="detective-evidence-line__meta">
                  R{ev.round} {WEIGHT_ICON[ev.weight] ?? "◇"}
                </span>{" "}
                {ev.description}
              </p>
            ))}
          {mode === "investigation" && !revealedRole && (
            <textarea
              className="detective-note-field"
              placeholder={`Anote suas observações sobre ${bot.name}…`}
              value={manualNote}
              onChange={(e) => onNoteChange(e.target.value)}
              rows={3}
            />
          )}
          {!revealedRole && (
            <label className="detective-theory-label">
              Minha teoria
              <select className="field-input" value={theory} onChange={(e) => onTheory(e.target.value)}>
                <option value="unknown">Ainda não sei</option>
                {GUESSABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_DISPLAY[r] ?? r}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}
    </div>
  );
}

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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const mode = room.soloModeDifficulty ?? "story";
  const bots = useMemo(() => players.filter((p) => p.isBot), [players]);
  const evidenceLog = myPlayer?.evidenceLog ?? [];
  const locationHistory = (myPlayer?.locationHistory ?? []) as LocationHistoryEntry[];

  const newCount = useMemo(
    () => evidenceLog.filter((e) => e.round === currentRound).length,
    [evidenceLog, currentRound],
  );

  const saveNote = useCallback(
    async (botId: string, text: string) => {
      const ref = doc(db, "rooms", roomCode, "players", playerId);
      const prev = myPlayer?.manualNotes ?? {};
      await updateDoc(ref, { manualNotes: { ...prev, [botId]: text } });
    },
    [db, roomCode, playerId, myPlayer?.manualNotes],
  );

  const noteTimers = useMemo(() => new Map<string, ReturnType<typeof setTimeout>>(), []);

  const onNoteChange = (botId: string, text: string) => {
    const prev = noteTimers.get(botId);
    if (prev) clearTimeout(prev);
    noteTimers.set(
      botId,
      setTimeout(() => {
        void saveNote(botId, text).catch(console.error);
      }, 600),
    );
  };

  const panel = (
    <div className={`detective-notebook${expanded ? " detective-notebook--open" : ""}`}>
      <button
        type="button"
        className="detective-notebook__toggle"
        onClick={() => setExpanded((e) => !e)}
      >
        🔍 Caderno de Evidências
        {mode === "story" && newCount > 0 ? ` · ${newCount} pistas novas` : ""}
      </button>
      {expanded && (
        <div className="detective-notebook__panel">
          {locationHistory.length > 0 && (
            <section className="detective-mapa">
              <h3 className="detective-mapa__title">Mapa de Bucaré</h3>
              <ul className="detective-mapa__list">
                {[...locationHistory]
                  .sort((a, b) => a.round - b.round)
                  .map((entry, i) => (
                    <li key={`${entry.round}-${entry.location}-${i}`} className="detective-mapa__item">
                      Rodada {entry.round} — {LOCATION_LABEL_PT[entry.location as keyof typeof LOCATION_LABEL_PT] ?? entry.location}:{" "}
                      {locationVisitResultShortPt(entry.result as LocationVisitResultKind)}
                    </li>
                  ))}
              </ul>
            </section>
          )}
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
                b.expelled || b.eliminated || !b.alive
                  ? revealedRoles?.[b.id!]
                  : undefined
              }
              onNoteChange={(t) => onNoteChange(b.id!, t)}
            />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="detective-notebook-desktop">{panel}</div>
      <div className="detective-notebook-mobile">
        <button type="button" className="detective-notebook-sheet-trigger" onClick={() => setSheetOpen(true)}>
          🔍 Caderno{newCount > 0 ? ` (${newCount})` : ""}
        </button>
        {sheetOpen && (
          <div className="detective-notebook-sheet">
            <div className="detective-notebook-sheet__backdrop" onClick={() => setSheetOpen(false)} />
            <div className="detective-notebook-sheet__content">{panel}</div>
          </div>
        )}
      </div>
    </>
  );
}
