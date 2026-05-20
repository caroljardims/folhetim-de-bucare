import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App.js";
import { AuthProvider } from "./context/AuthContext.js";
import { MasterIframeRoot } from "./auth/MasterIframeRoot.js";
import { isLocalDebug } from "./debug/isLocalDebug.js";
import {
  isMasterDebugPathname,
  openMasterDebugPanel,
} from "./lib/masterDebugRoute.js";
import {
  isMasterIframeClient,
  readMasterPlayerIdFromUrl,
  readMasterRoomCodeFromUrl,
} from "./auth/masterPlayerFirebase.js";
import "./styles.css";

const MasterDebugPanelLazy = lazy(() => import("./debug/master/MasterDebugPanel.js"));

if (typeof window !== "undefined" && isLocalDebug()) {
  window.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.ctrlKey && e.shiftKey && (e.key === "d" || e.key === "D")) {
      e.preventDefault();
      if (!window.location.search.includes("masterPlayerId=")) {
        window.dispatchEvent(new CustomEvent("folhetim-debug-toggle"));
      }
    }
    if (e.ctrlKey && e.shiftKey && (e.key === "m" || e.key === "M")) {
      e.preventDefault();
      openMasterDebugPanel();
    }
    if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key >= "0" && e.key <= "9") {
      const n = e.key === "0" ? 0 : Number(e.key);
      window.dispatchEvent(new CustomEvent("folhetim-master-focus", { detail: { index: n } }));
    }
  });
}

function Root() {
  if (typeof window !== "undefined") {
    if (!isLocalDebug() && isMasterDebugPathname(window.location.pathname)) {
      window.location.replace("/");
      return null;
    }
    if (isMasterDebugPathname(window.location.pathname)) {
      return (
        <Suspense fallback={<div className="page connecting-page"><p className="connecting-text">carregando painel mestre…</p></div>}>
          <MasterDebugPanelLazy />
        </Suspense>
      );
    }
  }

  const masterPlayerId = readMasterPlayerIdFromUrl();
  if (masterPlayerId) {
    return (
      <MasterIframeRoot>
        <App masterBootstrap={{ playerId: masterPlayerId, roomCode: readMasterRoomCodeFromUrl() }} />
      </MasterIframeRoot>
    );
  }

  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
