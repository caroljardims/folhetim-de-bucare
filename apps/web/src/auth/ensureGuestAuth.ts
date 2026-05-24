import { signInAnonymously, type Auth, type User } from "firebase/auth";

/** Lazily creates an anonymous Firebase Auth session when none exists. */
export async function ensureGuestAuth(auth: Auth): Promise<User> {
  if (auth.currentUser) return auth.currentUser;
  const cred = await signInAnonymously(auth);
  return cred.user;
}
