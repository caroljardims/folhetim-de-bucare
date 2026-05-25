import { setGlobalOptions } from "firebase-functions/v2";
import "./lib/db.js";

setGlobalOptions({ region: "us-central1", maxInstances: 10, invoker: "public" });

export {
  createRoom,
  joinRoom,
  startGame,
  startSoloDetectiveGame,
  addBots,
  restartGame,
} from "./handlers/game.js";

export {
  submitDetectiveGuesses,
  completeDetectiveEndFlow,
} from "./handlers/detective.js";

export {
  submitNightAction,
  markNightReady,
  startNight,
  submitCangaceiroConsult,
  submitNightSuspicion,
} from "./handlers/night.js";

export { submitVote, sendChatMessage, advanceDay } from "./handlers/day.js";

export {
  requestVotingFinalize,
  expireVotingFinalize,
  expireVotingFinalizeTask,
} from "./handlers/votingFinalize.js";

export {
  brasContinueChoice,
  coronelStartAccusation,
  coronelAccusationVote,
  cangaceiroTiroCerto,
} from "./handlers/dayActions.js";

export {
  submitSaciGorroChoice,
  expireSaciGorro,
  expireSaciGorroTask,
} from "./handlers/saciGorro.js";

export {
  startDebugGame,
  debugMasterRoomInfo,
  rejoinDebugPlayer,
  forceEndNight,
} from "./handlers/debug/game.js";

export {
  debugAdvancePhase,
  debugKillPlayer,
  debugExpelPlayer,
  debugForceWin,
  debugResetRound,
  debugGetPrivateLog,
  debugSetNightAction,
} from "./handlers/debug/actions.js";
