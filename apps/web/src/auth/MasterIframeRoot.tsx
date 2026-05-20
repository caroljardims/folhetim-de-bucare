import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { FirebaseServicesProvider } from "../context/FirebaseServicesContext.js";
import { AuthContext, type AuthContextValue } from "../context/authContextValue.js";
import {
  ensureMasterPlayerAuth,
  getMasterPlayerServices,
  readMasterPlayerIdFromUrl,
} from "./masterPlayerFirebase.js";

export function MasterIframeRoot({ children }: { children: ReactNode }) {
  const playerId = readMasterPlayerIdFromUrl();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const services = useMemo(
    () => (playerId ? getMasterPlayerServices(playerId) : null),
    [playerId],
  );

  useEffect(() => {
    if (!playerId || !services) return;
    let cancelled = false;
    void ensureMasterPlayerAuth(playerId).catch(() => {});
    const unsub = onAuthStateChanged(services.auth, (next) => {
      if (cancelled) return;
      setUser(next);
      setAuthReady(true);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [playerId, services]);

  if (!playerId || !services) return null;

  const authValue: AuthContextValue = {
    user,
    authReady,
    signOutUser: async () => {
      await services.auth.signOut();
    },
  };

  return (
    <FirebaseServicesProvider services={services}>
      <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
    </FirebaseServicesProvider>
  );
}
