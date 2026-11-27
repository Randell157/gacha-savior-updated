import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { adminAuth } from "@/lib/firebaseAdminAuth";
import { callAuthRest, loginEmail, siteOrigin } from "@/lib/firebaseAuthRest";
import { isRateLimited, takeHitIn } from "@/lib/rateLimit";
import { takeDaily } from "@/lib/rateWindow";
import { emailFrom, usernameFrom } from "@/lib/usernames";

// Sends a password reset link for an email or a username. Firebase emails the
// link to the account's address; the reply is the same whether or not the
// account exists, so this can't be used to find out who has an account or what
// a username's email is.
//
// The free Firebase plan sends only 150 reset emails a day for the whole
// project, so both paths come through here (security audit run 3) and are
// limited three ways:
// - 3 requests per 15 minutes per IP (rateLimits/, shared by every instance);
// - 3 emails per rolling hour per account and path (resetRequests/{uid}, which
//   the rules keep away from the browser), counted apart so someone who knows a
//   username can't use up the email path too. Over it the reply stays the same,
//   so it says nothing about the account;
// - 100 emails a day for the whole project (rateLimits/resetEmails, by Pacific
//   day, when Google's quotas reset), leaving room for the rest. Past it every
//   request gets the same "paused" answer, known account or not.

const SENT = { ok: true };
const TOO_MANY = "Too many tries. Wait a few minutes and try again.";
const PAUSED = "Password resets are paused until tomorrow. Please try again then.";
const INVALID_EMAIL = "That email address doesn't look right. Check it and try again.";
const PER_ACCOUNT = 3;
const ACCOUNT_WINDOW_MS = 60 * 60_000;
const DAILY_CAP = 100;

const daily = () => adminDb.collection("rateLimits").doc("resetEmails");

/** Whether today's project-wide reset emails are used up (read only). */
async function pausedToday() {
  return !takeDaily((await daily().get()).data(), Date.now(), DAILY_CAP).allowed;
}

/** Counts one more reset email for the whole project; false once today's are used up. */
async function takeDailyEmail() {
  return adminDb.runTransaction(async (transaction) => {
    const result = takeDaily((await transaction.get(daily())).data(), Date.now(), DAILY_CAP);
    if (result.allowed) transaction.set(daily(), { day: result.day, count: result.count });
    return result.allowed;
  });
}

/** The account's uid for an email, or null if there's none. */
async function uidForEmail(email: string) {
  try {
    return (await adminAuth.getUserByEmail(email)).uid;
  } catch (error) {
    // An address Firebase won't take can't have an account either.
    const code = (error as { code?: string }).code;
    if (code === "auth/user-not-found" || code === "auth/invalid-email") return null;
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    if (await isRateLimited(request, "reset", 3, 15 * 60_000)) {
      return NextResponse.json({ error: TOO_MANY }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    const byEmail = typeof body?.email === "string";
    const email = byEmail ? emailFrom(body) : "";
    if (byEmail && !email) return NextResponse.json({ error: INVALID_EMAIL }, { status: 400 });
    const username = byEmail ? "" : usernameFrom(body);
    if (!byEmail && !username) return NextResponse.json(SENT);

    // Before any lookup, so the answer is the same for every account.
    if (await pausedToday()) return NextResponse.json({ error: PAUSED }, { status: 429 });

    const uid = byEmail
      ? await uidForEmail(email)
      : (await adminDb.collection("usernames").doc(username.toLowerCase()).get()).get("uid");
    if (typeof uid !== "string") return NextResponse.json(SENT);
    // The login's own email, not the profile's copy, which the user can edit.
    const sendTo = await loginEmail(uid);
    if (!sendTo) return NextResponse.json(SENT);
    const path = byEmail ? "email" : "username";
    const accountRef = adminDb.collection("resetRequests").doc(uid);
    if (!(await takeHitIn(accountRef, path, PER_ACCOUNT, ACCOUNT_WINDOW_MS))) return NextResponse.json(SENT);
    // Only reached by a known account, so the reply can't differ from an unknown one's.
    if (!(await takeDailyEmail())) return NextResponse.json(SENT);

    const result = await callAuthRest(
      "sendOobCode",
      { requestType: "PASSWORD_RESET", email: sendTo },
      siteOrigin(request)
    );
    if (!result.ok && !result.message.startsWith("EMAIL_NOT_FOUND")) {
      if (result.message.startsWith("TOO_MANY_ATTEMPTS")) {
        return NextResponse.json({ error: TOO_MANY }, { status: 429 });
      }
      throw new Error(`Sending the reset email failed: ${result.message}`);
    }
    return NextResponse.json(SENT);
  } catch (error) {
    console.error("Password reset failed:", error);
    return NextResponse.json(
      { error: "Couldn't send the link right now. Please try again." },
      { status: 500 }
    );
  }
}
