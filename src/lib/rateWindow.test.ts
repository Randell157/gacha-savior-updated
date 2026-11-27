import { test } from "node:test";
import assert from "node:assert/strict";
import { pacificDay, takeDaily, takeHit } from "./rateWindow.ts";
import { MAX_USERNAME_LENGTH, emailFrom, usernameFrom, usernameProblem } from "./usernames.ts";

const MINUTE = 60_000;

test("a rolling window allows max tries, then refuses without counting", () => {
  let saved: unknown = undefined;
  for (let i = 0; i < 3; i++) {
    const result = takeHit(saved, 1_000 + i, 3, MINUTE);
    assert.equal(result.allowed, true);
    saved = result.hits;
  }
  const refused = takeHit(saved, 2_000, 3, MINUTE);
  assert.equal(refused.allowed, false);
  assert.deepEqual(refused.hits, [1_000, 1_001, 1_002]);
});

test("old tries leave the window one by one, so a boundary can't double the limit", () => {
  const saved = [0, 30_000, 50_000];
  // Just under a minute after the first try, all three still count.
  assert.equal(takeHit(saved, 59_999, 3, MINUTE).allowed, false);
  // At exactly a minute the first leaves, and only one new try fits.
  const next = takeHit(saved, MINUTE, 3, MINUTE);
  assert.equal(next.allowed, true);
  assert.deepEqual(next.hits, [30_000, 50_000, MINUTE]);
  assert.equal(takeHit(next.hits, MINUTE + 1, 3, MINUTE).allowed, false);
});

test("saved data that isn't a list of past times counts as no tries", () => {
  for (const saved of [undefined, null, "x", { 0: 1 }, [null, "1", Number.NaN]]) {
    assert.deepEqual(takeHit(saved, 5_000, 1, MINUTE), { allowed: true, hits: [5_000] });
  }
  // A time in the future (a clock that jumped back) doesn't count either.
  assert.deepEqual(takeHit([9_000], 5_000, 1, MINUTE).hits, [5_000]);
});

test("the Pacific day turns over at midnight in California, winter and summer", () => {
  // 2026-11-27 07:59 UTC is 23:59 on the 26th in PST (UTC-8).
  assert.equal(pacificDay(Date.UTC(2026, 10, 27, 7, 59)), "2026-11-26");
  assert.equal(pacificDay(Date.UTC(2026, 10, 27, 8, 0)), "2026-11-27");
  // In July it's PDT (UTC-7).
  assert.equal(pacificDay(Date.UTC(2026, 6, 4, 6, 59)), "2026-07-03");
  assert.equal(pacificDay(Date.UTC(2026, 6, 4, 7, 0)), "2026-07-04");
});

test("a daily cap counts up to max and starts again the next Pacific day", () => {
  const now = Date.UTC(2026, 10, 27, 12);
  assert.deepEqual(takeDaily(undefined, now, 100), { allowed: true, day: "2026-11-27", count: 1 });
  assert.deepEqual(takeDaily({ day: "2026-11-27", count: 99 }, now, 100), {
    allowed: true,
    day: "2026-11-27",
    count: 100,
  });
  assert.equal(takeDaily({ day: "2026-11-27", count: 100 }, now, 100).allowed, false);
  assert.deepEqual(takeDaily({ day: "2026-11-26", count: 100 }, now, 100).count, 1);
  assert.equal(takeDaily({ day: "2026-11-27", count: "junk" }, now, 100).count, 1);
});

test("usernames follow sign-up's rules and a length cap", () => {
  assert.equal(usernameProblem("Zach"), null);
  for (const bad of ["", "a/b", "a@b", ".", ".."]) assert.match(usernameProblem(bad) ?? "", /can't be empty/);
  assert.equal(usernameProblem("x".repeat(MAX_USERNAME_LENGTH)), null);
  assert.match(usernameProblem("x".repeat(MAX_USERNAME_LENGTH + 1)) ?? "", /at most 64/);
  assert.equal(usernameFrom({ username: "  Zach " }), "Zach");
  assert.equal(usernameFrom({ username: "x".repeat(65) }), "");
  assert.equal(usernameFrom({ username: 5 }), "");
  assert.equal(usernameFrom(null), "");
});

test("emails are trimmed and need a shape like an address", () => {
  assert.equal(emailFrom({ email: " a@b.test " }), "a@b.test");
  for (const bad of ["", "ab.test", "a@b", "a b@c.test", `${"x".repeat(320)}@b.test`, 5]) {
    assert.equal(emailFrom({ email: bad }), "", String(bad));
  }
});
