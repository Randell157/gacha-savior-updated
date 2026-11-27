import "server-only";

import { createHmac } from "node:crypto";
import type { DocumentReference } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { takeHit } from "@/lib/rateWindow";

// Limits for the signed-out auth routes, counted in Firestore so every server
// instance shares one count and a restart doesn't reset it (security audit
// run 3). The documents live in rateLimits/, which no rule matches, so only the
// Admin SDK reaches them. Each holds the times of the recent tries (a rolling
// window) and an `expiresAt`, so a Firestore TTL policy on that field can clear
// old ones.
//
// A copy of each count is also kept in memory, checked first: a flood from one
// IP is turned away without touching Firestore, whose free plan allows 50,000
// reads a day for the whole site. So Firestore sees at most `max` tries per
// window per IP from each instance (more only just after the memory fills up
// with 10,000 live keys and is cleared).
//
// On Vercel the IP headers come from Vercel itself, which overwrites what the
// client sends, so a client can't fake a new IP per request. Off Vercel (the
// dev server, the e2e tests) they're whatever the client sends, or "local".

function clientIp(request: Request) {
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "local"
  );
}

const MAX_KEYS = 10_000;
// Each key's recent tries, and when the last of them leaves its window.
const memory = new Map<string, { hits: number[]; until: number }>();

/** The in-memory copy: counts a try, false if it's over (nothing counted then). */
function takeHitInMemory(key: string, max: number, windowMs: number) {
  const now = Date.now();
  if (memory.size >= MAX_KEYS) {
    for (const [k, entry] of memory) if (entry.until <= now) memory.delete(k);
    if (memory.size >= MAX_KEYS) memory.clear();
  }
  const result = takeHit(memory.get(key)?.hits, now, max, windowMs);
  const last = result.hits[result.hits.length - 1] ?? now;
  memory.set(key, { hits: result.hits, until: last + windowMs });
  return result.allowed;
}

/**
 * Counts one try in `field` of `ref`; false if `max` tries were already made
 * in the last `windowMs` (and then nothing is counted).
 */
export async function takeHitIn(ref: DocumentReference, field: string, max: number, windowMs: number) {
  return adminDb.runTransaction(async (transaction) => {
    const now = Date.now();
    const result = takeHit((await transaction.get(ref)).get(field), now, max, windowMs);
    if (result.allowed) {
      transaction.set(ref, { [field]: result.hits, expiresAt: new Date(now + windowMs) }, { merge: true });
    }
    return result.allowed;
  });
}

/**
 * Whether this request goes over `max` per `windowMs` (a minute by default)
 * from its IP for the route called `name`. The IP is stored only as a keyed hash.
 */
export async function isRateLimited(request: Request, name: string, max: number, windowMs = 60_000) {
  // Keyed with a server-only secret, so the stored hash can't be turned back
  // into an IP by trying every address.
  const secret = process.env.FIREBASE_SERVICE_ACCOUNT_KEY ?? "local";
  const ip = createHmac("sha256", secret).update(clientIp(request)).digest("hex").slice(0, 32);
  const key = `${name}:${ip}`;
  if (!takeHitInMemory(key, max, windowMs)) return true;
  try {
    return !(await takeHitIn(adminDb.collection("rateLimits").doc(key), "hits", max, windowMs));
  } catch (error) {
    // Many tries at once on one document can make the transaction give up
    // (ABORTED, code 10): that's a flood, so answer "too many" rather than 500.
    if ((error as { code?: unknown }).code === 10) return true;
    throw error;
  }
}
