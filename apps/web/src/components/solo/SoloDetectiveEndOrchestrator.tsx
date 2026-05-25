import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EndScreen, type EndScreenProps } from "../screens/EndScreen.js";
import { FinalEditionNav } from "../screens/FinalEditionNav.js";
import {
  activeSoloEndSteps,
  initialSoloEndStep,
  nextSoloEndStep,
  prevSoloEndStep,
  readSoloEndStep,
  scorePending,
  soloEndDisplayProgress,
  writeSoloEndStep,
  type SoloEndStep,
} from "../../lib/soloEndSequence.js";
import { detectiveGuessesFromTheories } from "../../lib/detectiveTheories.js";
import type { PlayerDoc, RoomDoc } from "../../types.js";

const DetectiveEndFlowLazy = lazy(() =>
  import("../detective/DetectiveEndFlow.js").then((m) => ({
    default: m.DetectiveEndFlow,
  })),
);

type OrchestratorProps = Omit<EndScreenProps, "endSlice" | "hidePodium" | "hideInternalNav" | "editionProgress"> & {
  room: RoomDoc;
  run: EndScreenProps["run"];
  busy: EndScreenProps["busy"];
  isAnonymous: boolean;
  onPlayAgain: () => void;
  onChangeMode: () => void;
};

export function SoloDetectiveEndOrchestrator({
  room,
  roomCode,
  players,
  run,
  busy,
  isAnonymous,
  onPlayAgain,
  onChangeMode,
  ...endScreenProps
}: OrchestratorProps) {
  const steps = useMemo(() => activeSoloEndSteps(room), [room]);
  const [soloEndStep, setSoloEndStep] = useState<SoloEndStep>(() =>
    initialSoloEndStep(room, steps, readSoloEndStep(roomCode, steps)),
  );
  const autoScoreRef = useRef(false);

  useEffect(() => {
    writeSoloEndStep(roomCode, soloEndStep);
  }, [roomCode, soloEndStep]);

  const bots = useMemo(() => players.filter((p) => p.isBot && p.id), [players]);
  const botIds = useMemo(() => bots.map((b) => b.id!).filter(Boolean), [bots]);

  useEffect(() => {
    if (!scorePending(room)) return;
    if (autoScoreRef.current) return;
    if (botIds.length !== 6) return;
    autoScoreRef.current = true;
    const guesses = detectiveGuessesFromTheories(roomCode, botIds);
    void run("submitDetectiveGuesses", { roomCode, guesses }, "detectiveGuesses").catch(() => {
      autoScoreRef.current = false;
    });
  }, [room.soloMode, room.detectiveScore, roomCode, botIds, run, room]);

  const displayProgress = soloEndDisplayProgress(soloEndStep, steps);
  const navPage = displayProgress.current - 1;
  const isLastStep = soloEndStep === "detective_score";
  const waitingScore = scorePending(room);
  const scoringBusy = busy("detectiveGuesses");

  const goNext = useCallback(() => {
    if (isLastStep) {
      onPlayAgain();
      return;
    }
    if (waitingScore) return;
    const next = nextSoloEndStep(soloEndStep, steps);
    if (next) setSoloEndStep(next);
  }, [soloEndStep, steps, waitingScore, isLastStep, onPlayAgain]);

  const goPrev = useCallback(() => {
    if (waitingScore) return;
    const prev = prevSoloEndStep(soloEndStep, steps);
    if (prev) setSoloEndStep(prev);
  }, [soloEndStep, steps, waitingScore]);

  const nextDisabled = waitingScore;

  const endScreenBase = {
    ...endScreenProps,
    room,
    roomCode,
    players,
    hideInternalNav: true,
    editionProgress: undefined,
  };

  const detectiveFlowSteps = new Set<SoloEndStep>(["revelation", "detective_score"]);

  const stageContent =
    waitingScore && scoringBusy ? (
      <p className="solo-end-loading muted">Registrando suas teorias do caderno…</p>
    ) : waitingScore ? (
      <p className="solo-end-loading muted">Preparando o relatório…</p>
    ) : soloEndStep === "city_conclusion" ? (
      <EndScreen {...endScreenBase} endSlice="manchete" editionProgress={undefined} />
    ) : soloEndStep === "chronicle" ? (
      <EndScreen {...endScreenBase} endSlice="chronicle" hidePodium editionProgress={undefined} />
    ) : detectiveFlowSteps.has(soloEndStep) ? (
      <Suspense fallback={<p className="solo-end-loading muted">Abrindo o dossiê…</p>}>
        <DetectiveEndFlowLazy
          room={room}
          roomCode={roomCode}
          players={players}
          playerId={endScreenProps.playerId}
          myPlayer={players.find((p) => p.id === endScreenProps.playerId)}
          run={run}
          busy={busy}
          isAnonymous={isAnonymous}
          orchestrated
          forcedPhase={soloEndStep === "revelation" ? "reveal" : "score"}
          onPlayAgain={onPlayAgain}
          onChangeMode={onChangeMode}
          onChronicle={() => {}}
        />
      </Suspense>
    ) : null;

  return (
    <div className="screen screen--fim screen--solo-end-orchestrator">
      <p className="fim-edition-label">
        Edição final · {displayProgress.current}/{displayProgress.total}
      </p>

      <div className="solo-end-stage">{stageContent}</div>

      <FinalEditionNav
        page={navPage}
        pageCount={steps.length}
        onPrev={goPrev}
        onNext={goNext}
        nextDisabled={nextDisabled}
        isLastStep={isLastStep}
      />
    </div>
  );
}
