import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  signInAnonymously,
  type Auth,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
  type Functions,
} from "firebase/functions";
import { app as defaultApp } from "../firebase.js";
import type { FirebaseCall, FirebaseServices } from "../context/FirebaseServicesContext.js";

const useEmu = import.meta.env.VITE_USE_EMULATORS === "1";

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "localhost",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "lobisomem-do-sertao",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const TOKEN_PREFIX = "debug_player_token_";

function masterAppName(playerId: string): string {
  return `folhetim-master-${playerId}`;
}

function getOrInitMasterApp(playerId: string): FirebaseApp {
  const name = masterAppName(playerId);
  const existing = getApps().find((a) => a.name === name);
  if (existing) return existing;
  return initializeApp(cfg, name);
}

function wireEmulators(auth: Auth, db: Firestore, fn: Functions): void {
  if (!useEmu) return;
  try {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  } catch {
    /* already connected */
  }
  try {
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
  } catch {
    /* already connected */
  }
  try {
    connectFunctionsEmulator(fn, "127.0.0.1", 5001);
  } catch {
    /* already connected */
  }
}

const servicesCache = new Map<string, FirebaseServices>();

export function getMasterPlayerServices(playerId: string): FirebaseServices {
  const cached = servicesCache.get(playerId);
  if (cached) return cached;

  const mApp = getOrInitMasterApp(playerId);
  let mAuth: Auth;
  try {
    mAuth = getAuth(mApp);
  } catch {
    mAuth = initializeAuth(mApp, { persistence: indexedDBLocalPersistence });
  }
  const mDb = getFirestore(mApp);
  const mFn = getFunctions(mApp, import.meta.env.VITE_FUNCTIONS_REGION ?? "us-central1");
  wireEmulators(mAuth, mDb, mFn);

  const call: FirebaseCall = (name) => httpsCallable(mFn, name);
  const services: FirebaseServices = { auth: mAuth, db: mDb, fn: mFn, call };
  servicesCache.set(playerId, services);
  return services;
}

/** Persisted marker so reconnect knows this player had a session. */
export function readMasterTokenMarker(playerId: string): string | null {
  try {
    return localStorage.getItem(`${TOKEN_PREFIX}${playerId}`);
  } catch {
    return null;
  }
}

export function writeMasterTokenMarker(playerId: string, uid: string): void {
  try {
    localStorage.setItem(`${TOKEN_PREFIX}${playerId}`, uid);
  } catch {
    /* ignore */
  }
}

export async function ensureMasterPlayerAuth(playerId: string): Promise<FirebaseServices> {
  const services = getMasterPlayerServices(playerId);
  if (services.auth.currentUser) {
    writeMasterTokenMarker(playerId, services.auth.currentUser.uid);
    return services;
  }
  const cred = await signInAnonymously(services.auth);
  writeMasterTokenMarker(playerId, cred.user.uid);
  return services;
}

export function readMasterPlayerIdFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const id = new URLSearchParams(window.location.search).get("masterPlayerId");
  return id?.trim() || null;
}

export function readMasterRoomCodeFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const code = new URLSearchParams(window.location.search).get("roomCode");
  return code?.trim().toUpperCase() || null;
}

export function isMasterIframeClient(): boolean {
  return Boolean(readMasterPlayerIdFromUrl());
}

/** Default singleton app name (for non-master). */
export function getDefaultAppName(): string {
  return defaultApp.name;
}
