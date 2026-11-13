import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { callAuthRest, loginEmail } from "@/lib/firebaseAuthRest";
import { createRateLimit, usernameFrom } from "@/lib/rateLimit";

// Sends a password reset link for a username. Firebase emails the link to the
// account's address; the reply is the same whether or not the account exists,
// so this can't be used to find out who has an account or what their email is.
// (Resetting by email happens in the browser, since the person already knows it.)

const isRateLimited = createRateLimit(5);
const SENT = { ok: true };

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
