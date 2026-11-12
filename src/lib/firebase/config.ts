import type { FirebaseOptions } from "firebase/app";

/**
 * Firebase web config. These values identify the project; they are not secrets
 * (access is controlled by Firebase Auth and security rules). They still live in
 * environment variables so each environment can point at its own project.
 *
 * Each variable is read by its full name so Next.js can inline it at build time.
 */
const rawConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const requiredKeys = ["apiKey", "authDomain", "projectId", "appId"] as const;

export class MissingFirebaseConfigError extends Error {
  constructor(public readonly missingKeys: string[]) {
    super(
      `Missing Firebase config: ${missingKeys.join(", ")}. ` +
        "Copy .env.example to .env.local and fill in your Firebase web app values.",
    );
    this.name = "MissingFirebaseConfigError";
  }
}

/** Validates a raw config object. Exported separately so it can be unit tested. */
export function parseFirebaseConfig(config: Record<string, string | undefined>): FirebaseOptions {
  const missingKeys = requiredKeys.filter((key) => !config[key]?.trim());
  if (missingKeys.length > 0) {
    throw new MissingFirebaseConfigError([...missingKeys]);
  }
  const cleaned: FirebaseOptions = {};
  for (const [key, value] of Object.entries(config)) {
    if (value?.trim()) {
      cleaned[key as keyof FirebaseOptions] = value.trim();
    }
  }
  return cleaned;
}

export function getFirebaseConfig(): FirebaseOptions {
  return parseFirebaseConfig(rawConfig);
}

/** Region the Cloud Functions are deployed to. Must match functions/main.py. */
export const functionsRegion = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION || "us-central1";

/** Set NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true to talk to `firebase emulators:start`. */
export const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";
