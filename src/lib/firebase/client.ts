"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, type Functions } from "firebase/functions";

import { functionsRegion, getFirebaseConfig, useEmulators } from "./config";

type FirebaseClients = {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  functions: Functions;
};

let clients: FirebaseClients | null = null;

/**
 * Returns the Firebase clients, creating them on first use in the browser.
 *
 * Initialization is lazy so server rendering and `next build` never touch
 * Firebase, and a missing config only fails where Firebase is actually used.
 */
export function getFirebase(): FirebaseClients {
  if (typeof window === "undefined") {
    throw new Error("getFirebase() is browser-only. Call it from effects or event handlers.");
  }
  if (clients) return clients;

  const app = getApps().length > 0 ? getApp() : initializeApp(getFirebaseConfig());
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  const functions = getFunctions(app, functionsRegion);

  if (useEmulators) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(firestore, "127.0.0.1", 8080);
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  }

  clients = { app, auth, firestore, functions };
  return clients;
}
