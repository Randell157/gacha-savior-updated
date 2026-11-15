import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { callAuthRest, loginEmail } from "@/lib/firebaseAuthRest";
import { createRateLimit, usernameFrom } from "@/lib/rateLimit";

// Sends a password reset link for a username. Firebase emails the link to the
// account's address; the reply is the same whether or not the account exists,
// so this can't be used to find out who has an account or what their email is.
// (Resetting by email happens in the browser, since the person already knows it.)
//
// The free Firebase plan sends only 150 reset emails a day for the whole
// project, so this is limited twice: 3 requests per 15 minutes per IP, and 3
// emails per hour per account (counted in resetRequests/{uid}, which the rules
// keep away from the browser). Over the account cap the reply stays the same,
// so it says nothing about the account.

const isRateLimited = createRateLimit(3, 15 * 60_000);
const SENT = { ok: true };
const PER_ACCOUNT = 3;
const ACCOUNT_WINDOW_MS = 60 * 60_000;

/** Counts one more reset email for the account; false if it's over its hourly cap. */
async function allowResetFor(uid: string) {
  const ref = adminDb.collection("resetRequests").doc(uid);
  return adminDb.runTransaction(async (transaction) => {
    const now = Date.now();
    const data = (await transaction.get(ref)).data();
    const fresh = typeof data?.windowStart !== "number" || now - data.windowStart >= ACCOUNT_WINDOW_MS;
    const count = fresh ? 0 : Number(data?.count) || 0;
    if (count >= PER_ACCOUNT) return false;
    transaction.set(ref, { windowStart: fresh ? now : data!.windowStart, count: count + 1 });
    return true;
  });
}

export async function POST(request: Request) {
  if (isRateLimited(request)) {
    return NextResponse.json({ error: "Too many tries. Wait a few minutes and try again." }, { status: 429 });
  }

  const username = usernameFrom(await request.json().catch(() => null));
  if (!username) return NextResponse.json(SENT);

  try {
    const uid = (await adminDb.collection("usernames").doc(username.toLowerCase()).get()).get("uid");
    if (typeof uid !== "string") return NextResponse.json(SENT);
    const email = await loginEmail(uid);
    if (!email) return NextResponse.json(SENT);
    if (!(await allowResetFor(uid))) return NextResponse.json(SENT);

    const result = await callAuthRest(
      "sendOobCode",
      { requestType: "PASSWORD_RESET", email },
      new URL(request.url).origin
    );
    if (!result.ok && !result.message.startsWith("EMAIL_NOT_FOUND")) {
      if (result.message.startsWith("TOO_MANY_ATTEMPTS")) {
        return NextResponse.json({ error: "Too many tries. Wait a few minutes and try again." }, { status: 429 });
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
