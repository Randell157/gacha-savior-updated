import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { adminAuth } from "@/lib/firebaseAdminAuth";

// Changes the signed-in user's username. The rules don't let the browser delete
// the old claim in usernames/, so this runs on the server. The account always
// comes from the verified ID token, never from the request's content.

const TAKEN = "That username is taken. Try another.";
const INVALID = 'Usernames can\'t be empty or contain "/" or "@".';
const FAILED = "Couldn't change your username. Please try again.";

/** Thrown inside the transaction to stop it and show the player a message. */
class UsernameError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

export async function POST(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  let uid: string;
  try {
    uid = (await adminAuth.verifyIdToken(token, true)).uid;
  } catch (error) {
    console.error("Couldn't verify the sign-in:", error);
    return NextResponse.json({ error: "Log out, log back in, and try again." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  // The same rules as sign-up: names are document IDs, and login reads "@" as an email.
  if (!username || /[/@]/.test(username) || username === "." || username === "..") {
    return NextResponse.json({ error: INVALID }, { status: 400 });
  }

  try {
    await adminDb.runTransaction(async (transaction) => {
      const profileRef = adminDb.collection("users").doc(uid);
      const profile = await transaction.get(profileRef);
      const current = profile.data()?.username;
      if (typeof current !== "string") throw new UsernameError(FAILED, 500);

      const newClaimRef = adminDb.collection("usernames").doc(username.toLowerCase());
      const oldClaimRef = adminDb.collection("usernames").doc(current.toLowerCase());
      const [newClaim, oldClaim] = await Promise.all([
        transaction.get(newClaimRef),
        transaction.get(oldClaimRef),
      ]);
      if (newClaim.exists && newClaim.data()?.uid !== uid) throw new UsernameError(TAKEN, 409);

      transaction.set(newClaimRef, { uid });
      // Only capitals changing means the same claim, which must stay.
      if (oldClaimRef.id !== newClaimRef.id && oldClaim.data()?.uid === uid) {
        transaction.delete(oldClaimRef);
      }
      transaction.update(profileRef, { username });
    });
    return NextResponse.json({ username });
  } catch (error) {
    if (error instanceof UsernameError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Changing username failed:", error);
    return NextResponse.json({ error: FAILED }, { status: 500 });
  }
}
