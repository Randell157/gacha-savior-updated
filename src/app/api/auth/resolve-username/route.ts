import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

// Looks up the email for a username so the login page can sign in with it.
// Firestore rules keep users/{uid} private to signed-out visitors, so this
// read has to happen on the server.

const INVALID = "Invalid username or password.";

// Basic per-IP limit. It's kept in memory, so each server instance counts
// separately; enough to slow down guessing, not a hard guarantee.
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 10;
const attempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt <= now) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many login attempts. Please wait a minute and try again." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  // Same rules as sign-up: "/" can't appear in a document ID.
  if (!username || username.includes("/") || username === "." || username === "..") {
    return NextResponse.json({ error: INVALID }, { status: 401 });
  }

  try {
    // Usernames are claimed in lowercase. Accounts created before that may
    // still be stored with capitals until scripts/migrate-usernames.mjs runs,
    // so fall back to the exact spelling.
    const usernames = adminDb.collection("usernames");
    let usernameDoc = await usernames.doc(username.toLowerCase()).get();
    if (!usernameDoc.exists && username !== username.toLowerCase()) {
      usernameDoc = await usernames.doc(username).get();
    }
    const uid = usernameDoc.get("uid");
    if (typeof uid !== "string") {
      return NextResponse.json({ error: INVALID }, { status: 401 });
    }
    const email = (await adminDb.collection("users").doc(uid).get()).get("email");
    if (typeof email !== "string") {
      return NextResponse.json({ error: INVALID }, { status: 401 });
    }
    return NextResponse.json({ email });
  } catch (error) {
    console.error("Username lookup failed:", error);
    return NextResponse.json(
      { error: "Login is unavailable right now. Please try again later." },
      { status: 500 }
    );
  }
}
