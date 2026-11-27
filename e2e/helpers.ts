import { expect, type Page } from "@playwright/test";
import path from "node:path";

export const EMULATOR_PROJECT = "demo-gachasavior";
const AUTH = "http://127.0.0.1:9099";
const FIRESTORE = `http://127.0.0.1:8080/v1/projects/${EMULATOR_PROJECT}/databases/(default)/documents`;

/** The Irminsul sample: 91 characters, 336 weapons and 1,717 artifacts. */
export const SAMPLE_EXPORT = path.join(
  __dirname,
  "../public/sample-data/inventory-kamera/genshin_export_2026-02-11_12-16.json"
);

/** The older Inventory Kamera sample (2024), for comparing two uploads. */
export const OLDER_EXPORT = path.join(
  __dirname,
  "../public/sample-data/inventory-kamera/genshinData_GOOD_2024_10_28_01_22.json"
);

/** The made-up wish exports from `npm run data:test-wishes`. */
export const WISH_FILE = (name: "wishes-older.json" | "wishes-newer.json" | "wishes-paimon.xlsx") =>
  path.join(__dirname, "../public/sample-data/test-account", name);

/** The Wishes page's file input. */
export const wishInput = (page: Page) => page.getByLabel("Import a wish history file (.xlsx or .json)");

export type TestUser = { username: string; email: string; password: string; uid: string };

/** A name no other test (or earlier run) has used. Letters and digits only. */
export function uniqueName(prefix = "tester") {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Gives the page's requests an IP of their own. The signed-out auth routes
 * count tries per IP in Firestore for the whole run, so tests that share one
 * would run into each other's limits.
 */
export async function useOwnIp(page: Page) {
  const n = () => Math.floor(Math.random() * 254) + 1;
  await page.setExtraHTTPHeaders({ "x-real-ip": `10.${n()}.${n()}.${n()}` });
}

/** How many password reset emails the emulator has "sent" to this address. */
export async function resetEmailsSentTo(email: string): Promise<number> {
  const res = await fetch(`${AUTH}/emulator/v1/projects/${EMULATOR_PROJECT}/oobCodes`);
  const { oobCodes } = (await res.json()) as { oobCodes: { email: string; requestType: string }[] };
  return oobCodes.filter((code) => code.email === email && code.requestType === "PASSWORD_RESET").length;
}

/**
 * Creates an account the way sign-up does (auth user, `usernames` claim and
 * profile), but straight through the emulators, so tests that only need a
 * signed-in user don't go through the sign-up form.
 */
export async function createUser(prefix?: string): Promise<TestUser> {
  const username = uniqueName(prefix);
  const email = `${username}@example.test`;
  const password = `pw-${username}`;
  const signUp = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emulator`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  if (!signUp.ok) throw new Error(`Auth emulator sign-up failed: ${await signUp.text()}`);
  const { localId: uid } = await signUp.json();

  await ownerWrite(`usernames/${username.toLowerCase()}`, { uid });
  await ownerWrite(`users/${uid}`, { username, email, createdAt: new Date().toISOString() });
  return { username, email, password, uid };
}

/** Writes string fields to a document, skipping the security rules ("Bearer owner"). */
export async function ownerWrite(docPath: string, fields: Record<string, string>) {
  const res = await firestoreAs("owner", docPath, "PATCH", fields);
  if (!res.ok) throw new Error(`Firestore emulator write failed: ${await res.text()}`);
}

/**
 * A Firestore emulator REST request as a signed-in user (an ID token from
 * `idTokenFor`) or as "owner", which skips the rules. `docPath` may also name a
 * collection, to list it.
 */
export function firestoreAs(
  token: string,
  docPath: string,
  method: "GET" | "PATCH" | "DELETE" = "GET",
  fields?: Record<string, string>
) {
  return fetch(`${FIRESTORE}/${docPath}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: fields
      ? JSON.stringify({
          fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, { stringValue: v }])),
        })
      : undefined,
  });
}

/** Signs the user in through the Auth emulator and returns their ID token. */
export async function idTokenFor(user: TestUser): Promise<string> {
  const res = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email, password: user.password, returnSecureToken: true }),
  });
  if (!res.ok) throw new Error(`Auth emulator sign-in failed: ${await res.text()}`);
  return (await res.json()).idToken;
}

/**
 * Logs in through the login page and waits for the games hub. Uses the email
 * by default: username logins go through a route limited to 10 a minute.
 */
export async function logIn(page: Page, user: TestUser, by: "email" | "username" = "email") {
  await page.goto("/login");
  await page.locator("#identifier").fill(by === "email" ? user.email : user.username);
  await page.locator("#password").fill(user.password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText(`Hello, ${user.username}!`)).toBeVisible();
}

/** Uploads the Irminsul sample on the Genshin overview and waits for "Saved". */
export async function uploadSample(page: Page) {
  await page.goto("/genshin");
  await page.getByLabel("Upload a GOOD export (.json)").setInputFiles(SAMPLE_EXPORT);
  await expect(page.getByRole("alert").filter({ hasText: "Saved" })).toContainText(
    "91 characters, 336 weapons and 1,717 artifacts"
  );
}

/** Uploads a file made from the given text, for the upload error cases. */
export async function uploadText(page: Page, text: string, name = "export.json") {
  await page
    .getByLabel("Upload a GOOD export (.json)")
    .setInputFiles({ name, mimeType: "application/json", buffer: Buffer.from(text) });
}

/**
 * The error line under the login and sign-up forms. (A bare role "alert"
 * would also match Next.js's hidden route announcer.)
 */
export function formError(page: Page) {
  return page.locator("main p[role=alert]");
}
