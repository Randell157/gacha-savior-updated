import { expect, test } from "@playwright/test";
import { createUser, formError, logIn, uniqueName } from "./helpers";

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
});

test("protected pages send signed-out visitors to the login page", async ({ page }) => {
  // Weapons, Artifacts and Characters stay open signed out, with a log-in banner (pages.spec).
  for (const route of ["/dashboard", "/profile", "/genshin", "/genshin/characters/Aino"]) {
    await page.goto(route);
    await expect(page, `${route} should redirect`).toHaveURL(/\/login$/);
  }
});
