import "server-only";

import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Server-side Firebase with full admin access. Security rules don't apply to
// it, so only use it in API routes, and only for lookups the browser can't be
// trusted to do itself.

function loadServiceAccount() {
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!encoded) {
    throw new Error(
      "Missing FIREBASE_SERVICE_ACCOUNT_KEY. Add the base64-encoded service account JSON to .env.local (see .env.example)."
    );
  }
  try {
    return JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
  } catch {
    // Not the parse error itself: its message can quote part of the key.
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY isn't base64-encoded service account JSON. Encode the key file again (see .env.example)."
    );
  }
}

/**
 * Whether the server talks to the local emulators (`npm run dev:emu` and the
 * e2e tests set these). Against the Auth emulator, sign-ins aren't checked for
 * real, so the live site refuses to start in this mode.
 */
export function usingEmulators() {
  const emulators = Boolean(
    process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST
  );
  if (emulators && process.env.VERCEL_ENV === "production") {
    throw new Error("Emulator settings are set on the live site. Remove them from the Vercel env.");
  }
  return emulators;
}

// Against the emulators the Admin SDK needs no key, only the same demo project
// ID the browser uses.
function createApp() {
  if (usingEmulators()) {
    return initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
  }
  return initializeApp({ credential: cert(loadServiceAccount()) });
}

export const adminApp = getApps().length ? getApp() : createApp();

export const adminDb = getFirestore(adminApp);
