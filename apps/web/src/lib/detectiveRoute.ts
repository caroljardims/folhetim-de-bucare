export const DETECTIVE_GUIDE_PATH = "/modo-detetive/guia";

export function isDetectiveGuidePathname(pathname: string): boolean {
  return pathname === DETECTIVE_GUIDE_PATH;
}

export function navigateDetectiveGuide(): void {
  window.history.pushState(null, "", DETECTIVE_GUIDE_PATH);
  window.dispatchEvent(new Event("folhetim-route"));
}

export function closeDetectiveGuideToHome(): void {
  window.history.replaceState(null, "", "/");
  window.dispatchEvent(new Event("folhetim-route"));
}
