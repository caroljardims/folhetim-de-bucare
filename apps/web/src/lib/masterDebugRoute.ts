import { isLocalDebug } from "../debug/isLocalDebug.js";

export const MASTER_DEBUG_PATH = "/debug/master";

export function isMasterDebugPathname(pathname: string): boolean {
  return pathname === MASTER_DEBUG_PATH || pathname === `${MASTER_DEBUG_PATH}/`;
}

export function openMasterDebugPanel(): void {
  window.open(MASTER_DEBUG_PATH, "_blank", "noopener,noreferrer");
}
