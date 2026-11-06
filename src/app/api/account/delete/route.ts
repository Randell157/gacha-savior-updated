import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

// Deletes the signed-in user's account: their data, their username and their
// login. The username claim can't be deleted from the browser (see
// firestore.rules), so this runs on the server. The Admin SDK can delete
// anyone, so the account always comes from the verified ID token, never from
// the request's content.

// The browser re-authenticates just before calling this, so an old token left
// in an unattended browser isn't enough.
const MAX_SIGN_IN_AGE_SECONDS = 5 * 60;

const denied = () =>
  NextResponse.json({ error: "Log out, log back in, and try again." }, { status: 401 });

export async function POST(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  if (!token) return denied();

  let uid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(token, true);
    if (Date.now() / 1000 - decoded.auth_time > MAX_SIGN_IN_AGE_SECONDS) return denied();
    uid = decoded.uid;
  } catch (error) {
    console.error("Couldn't verify the sign-in:", error);
    return denied();
  }

  try {
    const profile = adminDb.collection("users").doc(uid);
    const username = (await profile.get()).data()?.username;

    // The login goes last, so if a step fails the person can log in and try again.
    await adminDb.recursiveDelete(profile);
    if (typeof username === "string" && username) {
      const claim = adminDb.collection("usernames").doc(username.toLowerCase());
      // Only their own: the profile's name isn't proof of who holds the claim.
      if ((await claim.get()).data()?.uid === uid) await claim.delete();
    }
    await adminAuth.deleteUser(uid);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Deleting account failed:", error);
    return NextResponse.json(
      { error: "Couldn't delete your account. Please try again." },
      { status: 500 }
    );
  }
}
