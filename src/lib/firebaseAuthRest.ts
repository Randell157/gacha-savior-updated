import "server-only";

import { usingEmulators } from "@/lib/firebaseAdmin";
import { adminAuth } from "@/lib/firebaseAdminAuth";

// Firebase Auth's REST API, for the two things the Admin SDK can't do: check a
// password and send a password reset email. The routes that use it keep the
// account's email on the server, so a username never reveals it.

/** The login's own email for a uid, or null if the login is gone. */
export async function loginEmail(uid: string): Promise<string | null> {
  try {
    return (await adminAuth.getUser(uid)).email ?? null;
  } catch (error) {
    if ((error as { code?: string }).code === "auth/user-not-found") return null;
    throw error;
  }
}

export type AuthRestResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; message: string };

/**
 * Calls `accounts:<method>`. `origin` is the site the request came from: the
 * web API key only accepts the site's own addresses, so the call names it as
 * the referrer, as the browser would.
 */
export async function callAuthRest(
  method: "signInWithPassword" | "sendOobCode",
  body: Record<string, unknown>,
  origin: string
): Promise<AuthRestResult> {
  const host = usingEmulators()
    ? `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com`
    : "https://identitytoolkit.googleapis.com";
  const key = encodeURIComponent(process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "");
  const response = await fetch(`${host}/v1/accounts:${method}?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Referer: `${origin}/` },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (response.ok) return { ok: true, data };
  const error = data.error as { message?: unknown } | undefined;
  return { ok: false, message: typeof error?.message === "string" ? error.message : String(response.status) };
}
