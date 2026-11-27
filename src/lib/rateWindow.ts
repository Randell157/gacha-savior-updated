// The counting behind the signed-out routes' limits (`src/lib/rateLimit.ts`),
// kept apart so it can be tested without Firestore.

/**
 * A rolling window: the saved try times still inside it, plus this one if it's
 * allowed. At `max` tries in the last `windowMs`, the try isn't allowed and
 * isn't counted. Anything that isn't a list of times counts as no tries.
 */
export function takeHit(saved: unknown, now: number, max: number, windowMs: number) {
  const hits = Array.isArray(saved)
    ? saved.filter((time): time is number => typeof time === "number" && time > now - windowMs && time <= now)
    : [];
  if (hits.length >= max) return { allowed: false, hits };
  return { allowed: true, hits: [...hits, now] };
}

const PACIFIC = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Los_Angeles",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The date in California ("2026-11-27"), since Google's daily quotas reset at midnight Pacific time. */
export function pacificDay(now: number) {
  return PACIFIC.format(now);
}

/** Counts one more against a daily cap; `allowed` is false (and nothing counted) once `max` is reached. */
export function takeDaily(saved: { day?: unknown; count?: unknown } | undefined, now: number, max: number) {
  const day = pacificDay(now);
  const count = saved?.day === day ? Number(saved.count) || 0 : 0;
  if (count >= max) return { allowed: false, day, count };
  return { allowed: true, day, count: count + 1 };
}
