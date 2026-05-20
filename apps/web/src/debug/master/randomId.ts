/** Client-side id compatible with server `randomId()`. */
export function randomPlayerId(): string {
  return Math.random().toString(36).slice(2, 10);
}
