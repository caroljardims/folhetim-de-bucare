import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from "firebase/auth";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ensureUserProfile } from "../auth/ensureUserProfile.js";
import { AuthContext, type AuthContextValue } from "./authContextValue.js";
import { FirebaseServicesProvider, useFirebaseServices } from "./FirebaseServicesContext.js";

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

function AuthProviderInner({ children }: { children: ReactNode }) {
  const { auth } = useFirebaseServices();
  const [user, setUser] = useState<AuthContextValue["user"]>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async (next) => {
      setUser(next);
      if (next) {
        try {
          await ensureUserProfile(next);
        } catch {
          // Profile write can fail if rules misconfigured; auth still works.
        }
      }
      setAuthReady(true);
    });
  }, [auth]);

  const signOutUser = useCallback(async () => {
    await firebaseSignOut(auth);
  }, [auth]);

  const value = useMemo(
    () => ({ user, authReady, signOutUser }),
    [user, authReady, signOutUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <FirebaseServicesProvider>
      <AuthProviderInner>{children}</AuthProviderInner>
    </FirebaseServicesProvider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
