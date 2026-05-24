import type { User } from "firebase/auth";

/** True when the user must sign in with a permanent account (not anonymous). */
export function requiresRealAuth(user: User | null): boolean {
  if (!user) return true;
  if (user.isAnonymous) return true;
  return false;
}
