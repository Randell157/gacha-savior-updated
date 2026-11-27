import { expect, test, type Page } from "@playwright/test";
import {
  createUser,
  firestoreAs,
  formError,
  idTokenFor,
  logIn,
  ownerWrite,
  resetEmailsSentTo,
  uniqueName,
  uploadSample,
  useOwnIp,
} from "./helpers";

const BAD_CREDENTIALS = "That email, username or password isn't right. Check them and try again.";

test.describe("sign-up", () => {
  test("creates an account, greets the user and logs out", async ({ page }) => {
    const username = uniqueName("Signup");
    await page.goto("/create-account");
    await page.locator("#username").fill(username);
    await page.locator("#email").fill(`${username}@example.test`);
    await page.locator("#password").fill("pw-123456");
    await page.locator("#confirm-password").fill("pw-123456");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText(`Hello, ${username}!`)).toBeVisible();

    await page.getByRole("button", { name: username }).click();
    await page.getByRole("menuitem", { name: "Log out" }).click();
    await expect(page.getByRole("banner").getByRole("link", { name: "Log in" })).toBeVisible();
  });

  test("rejects a username that differs only in capitals", async ({ page }) => {
    const existing = await createUser("taken");
    await page.goto("/create-account");
    await page.locator("#username").fill(existing.username.toUpperCase());
    await page.locator("#email").fill(`${uniqueName()}@example.test`);
    await page.locator("#password").fill("pw-123456");
    await page.locator("#confirm-password").fill("pw-123456");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(formError(page)).toHaveText(
      "That username is already taken. Please choose another."
    );
  });

  test("says when the passwords don't match", async ({ page }) => {
    await page.goto("/create-account");
    await page.locator("#username").fill(uniqueName());
    await page.locator("#email").fill(`${uniqueName()}@example.test`);
    await page.locator("#password").fill("pw-123456");
    await page.locator("#confirm-password").fill("pw-654321");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(formError(page)).toHaveText("The passwords don't match.");
  });

  test("says when the email already has an account", async ({ page }) => {
    const existing = await createUser();
    await page.goto("/create-account");
    await page.locator("#username").fill(uniqueName());
    await page.locator("#email").fill(existing.email);
    await page.locator("#password").fill("pw-123456");
    await page.locator("#confirm-password").fill("pw-123456");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(formError(page)).toHaveText(
      "That email already has an account. Log in instead."
    );
  });
});

test.describe("log in", () => {
  test("works with an email", async ({ page }) => {
    await logIn(page, await createUser());
  });

  test("works with a username in any capitals", async ({ page }) => {
    const user = await createUser("Mixed");
    await page.goto("/login");
    await page.locator("#identifier").fill(user.username.toLowerCase());
    await page.locator("#password").fill(user.password);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    // The greeting keeps the name as it was typed at sign-up.
    await expect(page.getByText(`Hello, ${user.username}!`)).toBeVisible();
  });

  test("shows one message for a wrong password or an unknown username", async ({ page }) => {
    const user = await createUser();
    await page.goto("/login");

    await page.locator("#identifier").fill(user.email);
    await page.locator("#password").fill("not-the-password");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(formError(page)).toHaveText(BAD_CREDENTIALS);

    await page.locator("#identifier").fill(uniqueName("nobody"));
    await page.getByRole("button", { name: "Log in" }).click();
    // Wait for the second attempt to finish before reading the message again.
    await expect(page.getByRole("button", { name: "Log in" })).toBeEnabled();
    await expect(formError(page)).toHaveText(BAD_CREDENTIALS);
    await expect(page).toHaveURL(/\/login$/);
  });

  test("the username route checks the password and never sends back the email", async ({ request }) => {
    const user = await createUser("private");
    const wrong = await request.post("/api/auth/username-login", {
      data: { username: user.username, password: "not-the-password" },
    });
    expect(wrong.status()).toBe(401);
    expect(await wrong.text()).not.toContain(user.email);

    const right = await request.post("/api/auth/username-login", {
      data: { username: user.username, password: user.password },
    });
    expect(right.status()).toBe(200);
    const body = await right.text();
    expect(body).not.toContain(user.email);
    expect(typeof JSON.parse(body).token).toBe("string");
  });
});

test.describe("username rules", () => {
  test("a name can be looked up but the list can't be read", async () => {
    const user = await createUser("reader");
    const other = await createUser("listed");
    const token = await idTokenFor(user);
    expect((await firestoreAs(token, `usernames/${other.username.toLowerCase()}`)).status).toBe(200);
    expect((await firestoreAs(token, "usernames")).status).toBe(403);
  });

  test("an account can't claim a second name or delete its profile", async () => {
    const user = await createUser("squatter");
    const token = await idTokenFor(user);
    const extra = await firestoreAs(token, `usernames/${uniqueName("extra")}`, "PATCH", { uid: user.uid });
    expect(extra.status).toBe(403);
    expect((await firestoreAs(token, `users/${user.uid}`, "DELETE")).status).toBe(403);
  });
});

test("protected pages send signed-out visitors to the login page", async ({ page }) => {
  // Weapons, Artifacts and Characters stay open signed out, with a log-in banner (pages.spec), and so do
  // a character's or weapon's own page, with the game's information only (search.spec).
  for (const route of ["/dashboard", "/profile", "/genshin"]) {
    await page.goto(route);
    await expect(page, `${route} should redirect`).toHaveURL(/\/login$/);
  }
});

test.describe("passwords", () => {
  const SENT = "If that account exists, a link is on its way.";

  test("forgot password sends a link by email or username", async ({ page }) => {
    const user = await createUser("forgot");
    await useOwnIp(page);
    await page.goto("/login");
    await page.getByRole("link", { name: "Forgot password?" }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);
    await page.getByLabel("Email or username").fill(user.username);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText(SENT)).toBeVisible();
    await expect.poll(() => resetEmailsSentTo(user.email)).toBe(1);

    await page.goto("/forgot-password");
    await page.getByLabel("Email or username").fill(user.email);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText(SENT)).toBeVisible();
    await expect.poll(() => resetEmailsSentTo(user.email)).toBe(2);
  });

  test("a username gets at most 3 reset emails an hour", async ({ request }) => {
    const user = await createUser("flooded");
    // A different IP each time, so only the per-account cap applies.
    for (let i = 0; i < 4; i++) {
      const response = await request.post("/api/auth/reset-password", {
        headers: { "x-real-ip": `198.51.100.${i + 1}` },
        data: { username: user.username },
      });
      expect(await response.json()).toEqual({ ok: true });
    }
    expect(await resetEmailsSentTo(user.email)).toBe(3);

    // The email path is counted apart, so it still sends.
    const byEmail = await request.post("/api/auth/reset-password", {
      headers: { "x-real-ip": "198.51.100.9" },
      data: { email: user.email },
    });
    expect(await byEmail.json()).toEqual({ ok: true });
    expect(await resetEmailsSentTo(user.email)).toBe(4);
  });

  test("a username reset suggests the email path too", async ({ page }) => {
    await useOwnIp(page);
    await page.goto("/forgot-password");
    await page.getByLabel("Email or username").fill(uniqueName("nobody"));
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText("try again with your email address")).toBeVisible();
  });

  test("forgot password says the same for an unknown account", async ({ page }) => {
    await useOwnIp(page);
    for (const unknown of [uniqueName("nobody"), `${uniqueName("nobody")}@example.test`]) {
      await page.goto("/forgot-password");
      await page.getByLabel("Email or username").fill(unknown);
      await page.getByRole("button", { name: "Send reset link" }).click();
      await expect(page.getByText(SENT)).toBeVisible();
    }
  });

  test("Profile changes the password after checking the current one", async ({ page }) => {
    const user = await createUser("changer");
    await logIn(page, user);
    await page.goto("/profile");
    await page.getByRole("button", { name: "Change password" }).click();
    await page.getByLabel("Current password").fill("not-the-password");
    await page.getByLabel("New password", { exact: true }).fill("new-pw-123456");
    await page.getByLabel("Confirm new password").fill("different");
    await page.getByRole("button", { name: "Save password" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "don't match" })).toBeVisible();

    await page.getByLabel("Confirm new password").fill("new-pw-123456");
    await page.getByRole("button", { name: "Save password" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "current password isn't right" })).toBeVisible();

    await page.getByLabel("Current password").fill(user.password);
    await page.getByRole("button", { name: "Save password" }).click();
    await expect(page.getByText("Your password was changed.")).toBeVisible();

    await page.getByRole("button", { name: user.username }).click();
    await page.getByRole("menuitem", { name: "Log out" }).click();
    await logIn(page, { ...user, password: "new-pw-123456" });
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});

test.describe("deleting", () => {
  test("the delete route refuses a request without a valid sign-in", async ({ request }) => {
    expect((await request.post("/api/account/delete")).status()).toBe(401);
    const forged = await request.post("/api/account/delete", {
      headers: { Authorization: "Bearer not-a-real-token" },
    });
    expect(forged.status()).toBe(401);
  });

  test("Delete upload removes the data and keeps the account", async ({ page }) => {
    const user = await createUser("wiper");
    await logIn(page, user);
    await page.goto("/genshin");
    await uploadSample(page);
    await page.goto("/profile");
    await page.getByRole("button", { name: "Delete upload" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Delete upload" }).click();
    await expect(page.getByText("Your upload was deleted.")).toBeVisible();
    await expect(page.getByText("Nothing uploaded yet")).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete upload" })).toHaveCount(0);

    await page.reload();
    await expect(page.getByText("Nothing uploaded yet")).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete account" })).toBeVisible();
  });

  test("Delete account needs the password, then frees the username", async ({ page }) => {
    const user = await createUser("leaver");
    // A second claim, as older accounts could have: deleting frees it too.
    const extraName = uniqueName("extra").toLowerCase();
    await ownerWrite(`usernames/${extraName}`, { uid: user.uid });
    await logIn(page, user);
    await page.goto("/profile");
    await page.getByRole("button", { name: "Delete account" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Password").fill("not-the-password");
    await dialog.getByRole("button", { name: "Delete account" }).click();
    await expect(dialog.getByRole("alert")).toHaveText("That password isn't right.");

    await dialog.getByLabel("Password").fill(user.password);
    await dialog.getByRole("button", { name: "Delete account" }).click();
    await expect(page).toHaveURL(/\/$/);
    expect((await firestoreAs("owner", `usernames/${extraName}`)).status).toBe(404);

    await page.goto("/login");
    await page.locator("#identifier").fill(user.email);
    await page.locator("#password").fill(user.password);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(formError(page)).toHaveText(BAD_CREDENTIALS);

    await page.goto("/create-account");
    await page.locator("#username").fill(user.username);
    await page.locator("#email").fill(`${uniqueName()}@example.test`);
    await page.locator("#password").fill("pw-123456");
    await page.locator("#confirm-password").fill("pw-123456");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});

test.describe("changing a username", () => {
  const change = async (page: Page, name: string) => {
    await page.getByRole("button", { name: "Change username" }).click();
    await page.getByLabel("New username").fill(name);
    await page.getByRole("button", { name: "Save username" }).click();
  };

  test("the route refuses a request without a valid sign-in", async ({ request }) => {
    const response = await request.post("/api/account/username", { data: { username: uniqueName() } });
    expect(response.status()).toBe(401);
  });

  test("a made-up name in the profile can't keep the old claim", async ({ request }) => {
    const user = await createUser("collector");
    const token = await idTokenFor(user);
    // The browser can write its own profile, so put someone else's name there.
    expect((await firestoreAs(token, `users/${user.uid}`, "PATCH", { username: uniqueName("nobody") })).ok).toBe(true);

    const renamed = uniqueName("renamed");
    const response = await request.post("/api/account/username", {
      headers: { Authorization: `Bearer ${token}` },
      data: { username: renamed },
    });
    expect(response.status()).toBe(200);
    expect((await firestoreAs("owner", `usernames/${user.username.toLowerCase()}`)).status).toBe(404);
    expect((await firestoreAs("owner", `usernames/${renamed.toLowerCase()}`)).status).toBe(200);
  });

  test("refuses bad and taken names, then logs in with the new one", async ({ page }) => {
    const other = await createUser("holder");
    const user = await createUser("renamer");
    await logIn(page, user);
    await page.goto("/profile");

    await change(page, "has/slash");
    await expect(page.getByRole("alert").filter({ hasText: "Usernames can't" })).toBeVisible();
    await page.getByRole("button", { name: "Cancel changing username" }).click();

    await change(page, other.username.toUpperCase());
    await expect(page.getByRole("alert").filter({ hasText: "taken" })).toBeVisible();
    await page.getByRole("button", { name: "Cancel changing username" }).click();

    const renamed = uniqueName("renamed");
    await change(page, renamed);
    await expect(page.getByText("Your username was changed.")).toBeVisible();
    await expect(page.getByRole("button", { name: renamed })).toBeVisible();

    await page.getByRole("button", { name: renamed }).click();
    await page.getByRole("menuitem", { name: "Log out" }).click();
    await logIn(page, { ...user, username: renamed }, "username");

    // The old name is free again.
    await page.getByRole("button", { name: renamed }).click();
    await page.getByRole("menuitem", { name: "Log out" }).click();
    await page.goto("/login");
    await page.locator("#identifier").fill(user.username);
    await page.locator("#password").fill(user.password);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(formError(page)).toHaveText(BAD_CREDENTIALS);
  });
});
