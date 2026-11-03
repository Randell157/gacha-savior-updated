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

export type TestUser = { username: string; email: string; password: string; uid: string };

/** A name no other test (or earlier run) has used. Letters and digits only. */
export function uniqueName(prefix = "tester") {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
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

  // "Bearer owner" lets the emulator skip the security rules.
  const write = async (docPath: string, fields: Record<string, string>) => {
    const res = await fetch(`${FIRESTORE}/${docPath}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: "Bearer owner" },
      body: JSON.stringify({
        fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, { stringValue: v }])),
      }),
    });
    if (!res.ok) throw new Error(`Firestore emulator write failed: ${await res.text()}`);
  };
  await write(`usernames/${username.toLowerCase()}`, { uid });
  await write(`users/${uid}`, { username, email, createdAt: new Date().toISOString() });
  return { username, email, password, uid };
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
