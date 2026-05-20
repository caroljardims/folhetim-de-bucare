/**
 * Localhost-only debug entry (Folhetim de Bucaré).
 * Multiplayer simulation moved to the Master Debug Panel.
 */
import { openMasterDebugPanel } from "../lib/masterDebugRoute.js";

type Props = {
  onClose: () => void;
};

export function DebugIntroPanel({ onClose }: Props) {
  return (
    <div className="debug-setup-overlay" role="dialog" aria-modal="true" aria-labelledby="debug-intro-title">
      <div className="debug-setup-sheet debug-setup-sheet--compact">
        <div className="debug-setup-head">
          <h2 id="debug-intro-title">Debug local</h2>
          <button type="button" className="debug-setup-close" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>

        <div className="debug-setup-scroll">
          <p className="copy-muted debug-setup-hint">
            Use o Painel Mestre para simular vários jogadores na mesma máquina (localhost). Ações de
            “god mode” (avançar fase, matar, forçar vitória) ficam na barra ⚙ dentro de cada partida
            debug.
          </p>
          <button
            type="button"
            className="primary-btn debug-master-link"
            onClick={() => openMasterDebugPanel()}
          >
            ⊞ Painel Mestre
          </button>
          <p className="copy-muted debug-setup-hint small">
            Abre <code>/debug/master</code> em nova aba · atalho <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+
            <kbd>M</kbd>
          </p>
        </div>

        <div className="debug-setup-actions">
          <button type="button" className="ghost-btn" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
