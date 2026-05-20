import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import type { Functions } from "firebase/functions";
import { httpsCallable, type HttpsCallable } from "firebase/functions";
import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { app, auth, db, fn } from "../firebase.js";

export type FirebaseCall = <T, R>(name: string) => HttpsCallable<T, R>;

export type FirebaseServices = {
  auth: Auth;
  db: Firestore;
  fn: Functions;
  call: FirebaseCall;
};

const defaultCall: FirebaseCall = (name) => httpsCallable(fn, name);

const defaultServices: FirebaseServices = {
  auth,
  db,
  fn,
  call: defaultCall,
};

const FirebaseServicesContext = createContext<FirebaseServices>(defaultServices);

export function FirebaseServicesProvider({
  services,
  children,
}: {
  services?: FirebaseServices;
  children: ReactNode;
}) {
  const value = useMemo(() => services ?? defaultServices, [services]);
  return (
    <FirebaseServicesContext.Provider value={value}>{children}</FirebaseServicesContext.Provider>
  );
}

export function useFirebaseServices(): FirebaseServices {
  return useContext(FirebaseServicesContext);
}

/** Default app id for non-master clients. */
export const DEFAULT_FIREBASE_APP_NAME = app.name;
