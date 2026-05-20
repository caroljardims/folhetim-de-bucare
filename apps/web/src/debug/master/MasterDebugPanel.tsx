// MASTER DEBUG PANEL — localhost only
// Never deploy. Hostname check prevents production render.
// This file is safe to commit.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isLocalDebug } from "../isLocalDebug.js";
import { DEBUG_ROLE_LABELS } from "../roleOptions.js";
import type { RoleId } from "folclore-game-engine";
import {
  connectMasterRoom,
  createMasterDebugRoom,
  fetchMasterRoomInfo,
  forceEndNightMaster,
  forceWinMaster,
  type MasterPlayerRow,
  type MasterRoomSnapshot,
} from "./masterOrchestrator.js";
import {
  clearMasterRoomCode,
  loadMasterRoomCode,
  loadMasterSlotNames,
  saveMasterSlotNames,
} from "./masterDebugStorage.js";
import "./masterDebug.css";

const STATUS_LABELS: Record<string, string> = {
  lobby: "lobby",
  night: "noite",
  day: "dia",
  ended: "encerrado",
};

const SIDE_LABELS: Record<string, string> = {
  morador: "morador",
  criatura: "criatura",
  neutro: "neutro",
};

function iframeSrc(playerId: string, roomCode: string): string {
  const url = new URL("/", window.location.origin);
  url.searchParams.set("masterPlayerId", playerId);
  url.searchParams.set("roomCode", roomCode);
  return url.toString();
}

function isPlayerTurn(
  snap: MasterRoomSnapshot | null,
  p: MasterPlayerRow,
): boolean {
  if (!snap || snap.room.status !== "night") return false;
  const role = p.role;
  if (!role || !snap.room.nightPendingRoles.includes(role)) return false;
  return snap.room.currentActorRole === role;
}

function nightPendingForPlayer(snap: MasterRoomSnapshot | null, p: MasterPlayerRow): boolean {
  if (!snap || snap.room.status !== "night" || !p.alive || p.expelled || p.eliminated) {
    return false;
  }
  const role = p.role;
  if (!role) return false;
  if (!snap.room.nightPendingRoles.includes(role)) return false;
  return !p.nightSubmitted;
}

export default function MasterDebugPanel() {
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [snap, setSnap] = useState<MasterRoomSnapshot | null>(null);
  const [slotCount, setSlotCount] = useState(5);
  const [slotNames, setSlotNames] = useState<string[]>(() => loadMasterSlotNames(5));
  const [namesOpen, setNamesOpen] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [syncScroll, setSyncScroll] = useState(false);
  const [forceWin, setForceWin] = useState<"moradores" | "criaturas" | "individual_objectives">(
    "moradores",
  );
  const iframeRefs = useRef<Array<HTMLIFrameElement | null>>([]);
  const scrollLock = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hostPlayerId = useMemo(() => {
    if (!snap) return "";
    return snap.room.hostPlayerId ?? "";
  }, [snap]);

  const resizeSlotNames = useCallback((count: number) => {
    const n = Math.min(12, Math.max(5, count));
    setSlotNames((prev) => {
      const base = loadMasterSlotNames(n);
      return base.map((d, i) => (prev[i]?.trim() ? prev[i]! : d));
    });
  }, []);

  const refresh = useCallback(async (code: string) => {
    const info = await fetchMasterRoomInfo(code);
    setSnap(info);
    return info;
  }, []);

  const connect = useCallback(async (code: string) => {
    setBusy("connect");
    setErr(null);
    try {
      saveMasterSlotNames(slotNames);
      const info = await connectMasterRoom(code, slotCount, slotNames);
      if (info.room.status === "ended") {
        clearMasterRoomCode();
      }
      setRoomCode(info.room.code);
      setRoomCodeInput(info.room.code);
      setSnap(info);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Falha ao conectar.");
    } finally {
      setBusy(null);
    }
  }, [slotCount, slotNames]);

  useEffect(() => {
    resizeSlotNames(slotCount);
  }, [resizeSlotNames, slotCount]);

  useEffect(() => {
    if (!isLocalDebug()) {
      window.location.replace("/");
      return;
    }
    const saved = loadMasterRoomCode();
    if (saved) {
      setRoomCodeInput(saved);
      void connect(saved).catch(() => clearMasterRoomCode());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só ao montar
  }, []);

  useEffect(() => {
    const onFocus = (ev: Event) => {
      const detail = (ev as CustomEvent<{ index: number }>).detail;
      const idx = detail?.index ?? 0;
      if (idx === 0) {
        document.querySelector<HTMLElement>(".master-debug__header")?.focus();
        return;
      }
      const iframe = iframeRefs.current[idx - 1];
      iframe?.focus();
      iframe?.contentWindow?.focus();
    };
    window.addEventListener("folhetim-master-focus", onFocus);
    return () => window.removeEventListener("folhetim-master-focus", onFocus);
  }, []);

  useEffect(() => {
    if (!roomCode) return;
    pollRef.current = setInterval(() => {
      void refresh(roomCode).catch(() => {});
    }, 2500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [roomCode, refresh]);

  useEffect(() => {
    if (!syncScroll) return;
    const handlers: Array<{ el: HTMLElement; fn: () => void }> = [];
    for (const iframe of iframeRefs.current) {
      const doc = iframe?.contentDocument;
      const scroller =
        doc?.scrollingElement ?? doc?.documentElement ?? doc?.body;
      if (!scroller) continue;
      const fn = () => {
        if (scrollLock.current) return;
        scrollLock.current = true;
        const y = scroller.scrollTop;
        for (const other of iframeRefs.current) {
          const oDoc = other?.contentDocument;
          const oScroll =
            oDoc?.scrollingElement ?? oDoc?.documentElement ?? oDoc?.body;
          if (oScroll && oScroll !== scroller) oScroll.scrollTop = y;
        }
        requestAnimationFrame(() => {
          scrollLock.current = false;
        });
      };
      scroller.addEventListener("scroll", fn, { passive: true });
      handlers.push({ el: scroller, fn });
    }
    return () => {
      for (const { el, fn } of handlers) el.removeEventListener("scroll", fn);
    };
  }, [syncScroll, snap?.players.length, roomCode]);

  const createNew = async () => {
    setBusy("create");
    setErr(null);
    try {
      saveMasterSlotNames(slotNames);
      const { roomCode: code } = await createMasterDebugRoom(slotCount, slotNames);
      setRoomCode(code);
      setRoomCodeInput(code);
      const info = await fetchMasterRoomInfo(code);
      setSnap(info);
      if (info.room.status === "ended") clearMasterRoomCode();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Falha ao criar sala.");
    } finally {
      setBusy(null);
    }
  };

  const players = snap?.players.filter((p) => !p.isBot) ?? [];
  const status = snap?.room.status ?? "";
  const showForceDawn = status === "night";

  return (
    <div className="master-debug">
      <header className="master-debug__header" tabIndex={-1}>
        <div className="master-debug__header-left">
          <label className="master-debug__code-label">
            <span className="sr-only">Código da sala</span>
            <input
              className="master-debug__code-input"
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
              placeholder="DCZ5"
              maxLength={6}
            />
          </label>
          <button
            type="button"
            className="master-debug__btn"
            disabled={!!busy || !roomCodeInput.trim()}
            onClick={() => void connect(roomCodeInput.trim())}
          >
            {busy === "connect" ? "…" : "Conectar"}
          </button>
          {roomCode && (
            <span className="master-debug__code-display" title="Sala conectada">
              {roomCode}
            </span>
          )}
        </div>

        <div className="master-debug__header-mid">
          {snap && (
            <>
              <span className={`master-debug__pill master-debug__pill--${status}`}>
                {STATUS_LABELS[status] ?? status}
              </span>
              <span className="master-debug__meta">
                Rodada {snap.room.round || "—"}
              </span>
              <span className="master-debug__meta">{players.length} jogadores</span>
            </>
          )}
        </div>

        <div className="master-debug__header-right">
          <label className="master-debug__slots">
            <span className="master-debug__slots-label">Jogadores</span>
            <input
              type="number"
              min={5}
              max={12}
              value={slotCount}
              onChange={(e) => {
                const n = Math.min(12, Math.max(5, Number(e.target.value) || 5));
                setSlotCount(n);
                resizeSlotNames(n);
              }}
              className="master-debug__slots-input"
            />
          </label>
          <button
            type="button"
            className="master-debug__btn master-debug__btn--primary"
            disabled={!!busy}
            onClick={() => void createNew()}
          >
            {busy === "create" ? "…" : "Nova sala debug"}
          </button>
          {showForceDawn && roomCode && hostPlayerId && (
            <button
              type="button"
              className="master-debug__btn"
              disabled={!!busy}
              onClick={() => {
                setBusy("dawn");
                void forceEndNightMaster(roomCode, hostPlayerId)
                  .then(() => refresh(roomCode))
                  .catch((e: unknown) =>
                    setErr(e instanceof Error ? e.message : "Erro ao forçar amanhecer."),
                  )
                  .finally(() => setBusy(null));
              }}
            >
              Forçar amanhecer
            </button>
          )}
          {roomCode && hostPlayerId && (
            <div className="master-debug__force-win">
              <select
                className="master-debug__select"
                value={forceWin}
                onChange={(e) =>
                  setForceWin(e.target.value as typeof forceWin)
                }
              >
                <option value="moradores">moradores</option>
                <option value="criaturas">criaturas</option>
                <option value="individual_objectives">individual</option>
              </select>
              <button
                type="button"
                className="master-debug__btn"
                disabled={!!busy}
                onClick={() => {
                  setBusy("win");
                  void forceWinMaster(roomCode, hostPlayerId, forceWin)
                    .then(() => refresh(roomCode))
                    .catch((e: unknown) =>
                      setErr(e instanceof Error ? e.message : "Erro ao encerrar."),
                    )
                    .finally(() => setBusy(null));
                }}
              >
                Forçar fim
              </button>
            </div>
          )}
          <label className="master-debug__sync">
            <input
              type="checkbox"
              checked={syncScroll}
              onChange={(e) => setSyncScroll(e.target.checked)}
            />
            Sincronizar rolagem
          </label>
          <span className="master-debug__hint">Ctrl+Shift+M</span>
        </div>
      </header>

      {err && <p className="master-debug__error">{err}</p>}

      <div className="master-debug__names-bar">
        <button
          type="button"
          className="master-debug__names-toggle"
          onClick={() => setNamesOpen((o) => !o)}
          aria-expanded={namesOpen}
        >
          {namesOpen ? "▾" : "▸"} Nomes dos jogadores (mín. 5)
        </button>
        {namesOpen && (
          <div className="master-debug__names-grid">
            {slotNames.map((name, i) => (
              <label key={i} className="master-debug__name-field">
                <span className="master-debug__name-label">
                  {i === 0 ? "Anfitrião" : `Jog. ${i + 1}`}
                </span>
                <input
                  className="master-debug__name-input"
                  value={name}
                  maxLength={40}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSlotNames((prev) => {
                      const next = [...prev];
                      next[i] = v;
                      return next;
                    });
                  }}
                />
              </label>
            ))}
          </div>
        )}
        {snap && players.length < 5 && (
          <p className="master-debug__warn">
            Mínimo 5 jogadores — use Conectar ou Nova sala debug para completar a mesa.
          </p>
        )}
      </div>

      <div className="master-debug__columns">
        {roomCode &&
          players.map((p, idx) => {
            const turn = isPlayerTurn(snap, p);
            const pending = nightPendingForPlayer(snap, p);
            const ready =
              snap?.room.status === "night" &&
              (snap.room.nightReadyPlayerIds?.includes(p.id) ?? false);
            const submitted = p.nightSubmitted;
            const roleLabel =
              p.role && p.role in DEBUG_ROLE_LABELS
                ? DEBUG_ROLE_LABELS[p.role as RoleId]
                : p.role ?? "—";

            return (
              <div
                key={p.id}
                className={`master-debug__col${turn ? " master-debug__col--turn" : ""}`}
              >
                <div className="master-debug__col-head">
                  <div className="master-debug__col-title">
                    {turn && <span className="master-debug__dot master-debug__dot--pulse" />}
                    <strong>{p.name}</strong>
                    {p.isSpokesperson && <span title="Porta-voz">👑</span>}
                    {!p.alive || p.eliminated ? (
                      <span title="Eliminado">💀</span>
                    ) : p.expelled ? (
                      <span title="Expulso">🚪</span>
                    ) : snap?.room.status === "night" ? (
                      <span title="Noite">🌙</span>
                    ) : snap?.room.status === "day" ? (
                      <span title="Dia">☀️</span>
                    ) : null}
                    {pending && <span className="master-debug__pending" title="Ação pendente">🌙</span>}
                    {submitted && snap?.room.status === "night" && (
                      <span className="master-debug__done" title="Ação enviada">✓</span>
                    )}
                  </div>
                  <div className="master-debug__col-role">
                    <span>{roleLabel}</span>
                    {p.side && (
                      <span className={`master-debug__side master-debug__side--${p.side}`}>
                        {SIDE_LABELS[p.side] ?? p.side}
                      </span>
                    )}
                    {turn && <span className="master-debug__ativo">Ativo</span>}
                  </div>
                </div>
                <iframe
                  ref={(el) => {
                    iframeRefs.current[idx] = el;
                  }}
                  className="master-debug__iframe"
                  title={`${p.name} — visão do jogador`}
                  src={iframeSrc(p.id, roomCode)}
                />
              </div>
            );
          })}
        {!roomCode && (
          <p className="master-debug__empty">
            Conecte a uma sala ou crie uma nova partida debug.
          </p>
        )}
      </div>
    </div>
  );
}
