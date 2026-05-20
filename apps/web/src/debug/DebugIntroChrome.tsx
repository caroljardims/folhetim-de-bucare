/**
 * Localhost debug landing chrome: FAB + intro overlay (Master Panel entry).
 * Only mount when `isLocalDebug()` is true upstream.
 */
import { DebugFab } from "./DebugFab.js";
import { DebugIntroPanel } from "./DebugIntroPanel.js";

export type DebugIntroChromeProps = {
  panelOpen: boolean;
  onPanelOpenChange: (open: boolean) => void;
};

export default function DebugIntroChrome({
  panelOpen,
  onPanelOpenChange,
}: DebugIntroChromeProps) {
  return (
    <>
      <DebugFab onClick={() => onPanelOpenChange(true)} />
      {panelOpen && <DebugIntroPanel onClose={() => onPanelOpenChange(false)} />}
    </>
  );
}
