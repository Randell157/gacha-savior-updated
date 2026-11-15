import "server-only";

// Basic per-IP limit for the signed-out auth routes. It's kept in memory, so
// each server instance counts separately: enough to slow down guessing, not a
// hard guarantee. On Vercel the IP headers come from Vercel itself, so a client
// can't fake a new IP per request (checked on the live site, 2026-11-15).

const MAX_KEYS = 10_000;

/** Returns a check that says whether this request goes over `max` per `windowMs` (a minute by default). */
export function createRateLimit(max: number, windowMs = 60_000) {
  const attempts = new Map<string, { count: number; resetAt: number }>();

  return function isRateLimited(request: Request) {
    const ip =
      request.headers.get("x-real-ip") ??
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      "local";
    const now = Date.now();
    // Keep the map from growing without end.
    if (attempts.size >= MAX_KEYS) {
      for (const [key, entry] of attempts) if (entry.resetAt <= now) attempts.delete(key);
      if (attempts.size >= MAX_KEYS) attempts.clear();
    }
    const entry = attempts.get(ip);
    if (!entry || entry.resetAt <= now) {
      attempts.set(ip, { count: 1, resetAt: now + windowMs });
      return false;
    }
    entry.count += 1;
    return entry.count > max;
  };
}

/** The username from a request body, or "" if it can't be a username. */
export function usernameFrom(body: unknown) {
  const raw = (body as { username?: unknown } | null)?.username;
  const username = typeof raw === "string" ? raw.trim() : "";
  // Same rules as sign-up: "/" can't appear in a document ID, and "@" means an email.
  if (!username || /[/@]/.test(username) || username === "." || username === "..") return "";
  return username;
}
