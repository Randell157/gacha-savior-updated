import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { adminAuth } from "@/lib/firebaseAdminAuth";
import { callAuthRest, loginEmail, siteOrigin } from "@/lib/firebaseAuthRest";
import { isRateLimited } from "@/lib/rateLimit";
import { usernameFrom } from "@/lib/usernames";

// Logs in with a username. The server looks up the account's email, checks
// the password with Firebase, and only then sends back a one-time sign-in
// token. The email never leaves the server, so a username can't be used to
// find out someone's email.

const INVALID = "That email, username or password isn't right. Check them and try again.";
// Firebase's answers for a wrong password or a missing or disabled account.
const BAD_CREDENTIALS = new Set([
  "INVALID_LOGIN_CREDENTIALS",
  "INVALID_PASSWORD",
  "EMAIL_NOT_FOUND",
  "USER_DISABLED",
  "INVALID_EMAIL",
]);

const invalid = () => NextResponse.json({ error: INVALID }, { status: 401 });
const tooMany = () =>
  NextResponse.json(
    { error: "Too many login attempts. Please wait a minute and try again." },
    { status: 429 }
  );

export async function POST(request: Request) {
  try {
    // 10 a minute per IP, shared by every server instance (src/lib/rateLimit.ts).
    if (await isRateLimited(request, "login", 10)) return tooMany();

    const body = await request.json().catch(() => null);
    const username = usernameFrom(body);
    const password = typeof body?.password === "string" ? body.password : "";
    if (!username || !password || password.length > 4096) return invalid();

    // Usernames are stored lowercase, so any capitalization matches.
    const claim = await adminDb.collection("usernames").doc(username.toLowerCase()).get();
    const uid = claim.get("uid");
    if (typeof uid !== "string") return invalid();
    // The login's own email, not the profile's copy, which the user can edit.
    const email = await loginEmail(uid);
    if (!email) return invalid();

    const result = await callAuthRest(
      "signInWithPassword",
      { email, password, returnSecureToken: false },
      siteOrigin(request)
    );
    if (!result.ok) {
      if (result.message.startsWith("TOO_MANY_ATTEMPTS")) return tooMany();
      if (BAD_CREDENTIALS.has(result.message.split(" ")[0])) return invalid();
      throw new Error(`Password check failed: ${result.message}`);
    }
    if (result.data.localId !== uid) return invalid();

    return NextResponse.json({ token: await adminAuth.createCustomToken(uid) });
  } catch (error) {
    console.error("Username login failed:", error);
    return NextResponse.json(
      { error: "Couldn't log in right now. Please try again." },
      { status: 500 }
    );
  }
}
