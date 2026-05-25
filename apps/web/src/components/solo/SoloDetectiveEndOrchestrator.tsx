import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EndScreen, type EndScreenProps } from "../screens/EndScreen.js";
import { FinalEditionNav } from "../screens/FinalEditionNav.js";
import {
  activeSoloEndSteps,
  nextSoloEndStep,
  prevSoloEndStep,
  readSoloEndStep,
  shouldSkipAccusation,
  soloEndStepIndex,
  writeSoloEndStep,
  type SoloEndStep,
} from "../../lib/soloEndSequence.js";
import { readDetectiveTheories } from "../../lib/detectiveTheories.js";
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
  const steps = useMemo(() => activeSoloEndSteps(room), [room.detectiveEliminatedAt]);
  const [soloEndStep, setSoloEndStep] = useState<SoloEndStep>(() => {
    const stored = readSoloEndStep(roomCode);
    if (stored && steps.includes(stored)) return stored;
    return "city_conclusion";
  });
  const autoSubmitRef = useRef(false);

  useEffect(() => {
    writeSoloEndStep(roomCode, soloEndStep);
  }, [roomCode, soloEndStep]);

  const stepIndex = soloEndStepIndex(soloEndStep, steps);
  const editionProgress = { current: stepIndex + 1, total: steps.length };

  const goNext = useCallback(() => {
    const next = nextSoloEndStep(soloEndStep, steps);
    if (next) setSoloEndStep(next);
  }, [soloEndStep, steps]);

  const goPrev = useCallback(() => {
    const prev = prevSoloEndStep(soloEndStep, steps);
    if (prev) setSoloEndStep(prev);
  }, [soloEndStep, steps]);

  const bots = useMemo(() => players.filter((p) => p.isBot && p.id), [players]);

  useEffect(() => {
    if (soloEndStep !== "revelation") return;
    if (!shouldSkipAccusation(room)) return;
    if (room.detectiveScore) return;
    if (autoSubmitRef.current) return;
    autoSubmitRef.current = true;
    const theories = readDetectiveTheories(roomCode);
    const guesses: Record<string, string> = {};
    for (const b of bots) {
      guesses[b.id!] = theories[b.id!] ?? "unknown";
    }
    void run("submitDetectiveGuesses", { roomCode, guesses }, "detectiveGuesses").catch(() => {
      autoSubmitRef.current = false;
    });
  }, [soloEndStep, room.detectiveScore, room.detectiveEliminatedAt, roomCode, bots, run, room]);

  const navSteps = new Set<SoloEndStep>(["city_conclusion", "chronicle"]);
  const showOrchestratorNav = navSteps.has(soloEndStep);
  const navPage = stepIndex;
  const navNextDisabled =
    soloEndStep === "chronicle" && shouldSkipAccusation(room) && busy("detectiveGuesses");

  const endScreenBase = {
    ...endScreenProps,
    room,
    roomCode,
    players,
    hideInternalNav: true,
    editionProgress,
  };

  return (
    <div className="screen screen--fim screen--solo-end-orchestrator">
      <p className="fim-edition-label">
        Edição final · {editionProgress.current}/{editionProgress.total}
      </p>

      {soloEndStep === "city_conclusion" && (
        <EndScreen {...endScreenBase} endSlice="manchete" editionProgress={undefined} />
      )}

      {soloEndStep === "chronicle" && (
        <EndScreen {...endScreenBase} endSlice="chronicle" hidePodium editionProgress={undefined} />
      )}

      {(soloEndStep === "accusation" ||
        soloEndStep === "revelation" ||
        soloEndStep === "detective_score") && (
        <Suspense fallback={null}>
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
            forcedPhase={
              soloEndStep === "accusation"
                ? "accusation"
                : soloEndStep === "revelation"
                  ? "reveal"
                  : "score"
            }
            onAccusationSubmitted={() => setSoloEndStep("revelation")}
            onRevealComplete={() => setSoloEndStep("detective_score")}
            onPlayAgain={onPlayAgain}
            onChangeMode={onChangeMode}
            onChronicle={() => setSoloEndStep("chronicle")}
          />
        </Suspense>
      )}

      {showOrchestratorNav && (
        <FinalEditionNav
          page={navPage}
          pageCount={steps.length}
          onPrev={goPrev}
          onNext={goNext}
          nextDisabled={navNextDisabled}
        />
      )}
    </div>
  );
}
