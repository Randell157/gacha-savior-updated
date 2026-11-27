import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { adminAuth } from "@/lib/firebaseAdminAuth";

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

  // A marker the rules check before a profile can be created, so the browser,
  // whose ID token stays valid for up to an hour, can't recreate a profile (and
  // claim a username) while the data is being deleted (security audit run 3).
  const marker = adminDb.collection("deletedAccounts").doc(uid);
  try {
    await marker.set({ deletedAt: new Date() });
    // No new sessions or token refreshes from here on.
    await adminAuth.updateUser(uid, { disabled: true });
    await adminAuth.revokeRefreshTokens(uid);
    await adminDb.recursiveDelete(adminDb.collection("users").doc(uid));
    // Every claim that points at this account, not just the one the profile
    // names (older accounts could hold more than one).
    const claims = await adminDb.collection("usernames").where("uid", "==", uid).get();
    const batch = adminDb.batch();
    for (const claim of claims.docs) batch.delete(claim.ref);
    // The reset-email counter from /api/auth/reset-password, if there is one.
    batch.delete(adminDb.collection("resetRequests").doc(uid));
    await batch.commit();
    // The login goes last, so if a step fails the person can log in and try again.
    await adminAuth.deleteUser(uid);
    // A reset request that came in mid-delete could have written this again.
    await adminDb.collection("resetRequests").doc(uid).delete();
    // The marker stays: uids aren't reused, and it keeps refusing that token.
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Deleting account failed:", error);
    // Let the person log in again to retry (if the login still exists).
    await adminAuth.updateUser(uid, { disabled: false }).catch(() => {});
    await marker.delete().catch(() => {});
    return NextResponse.json(
      { error: "Couldn't delete your account. Please try again." },
      { status: 500 }
    );
  }
}
