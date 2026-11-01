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
  return JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
}

const adminApp = getApps().length
  ? getApp()
  : initializeApp({ credential: cert(loadServiceAccount()) });

export const adminDb = getFirestore(adminApp);
