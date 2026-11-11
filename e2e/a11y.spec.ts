import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { createUser, formError, logIn, uploadSample, uploadText } from "./helpers";

// WCAG 2.1 AA, as in the 2026-11-02 audit. Every page is checked in light and
// dark mode (the site follows the system theme by default).
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function expectNoViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const summary = results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.map((n) => n.target.join(" ")).join("\n  ")}`
  );
  expect(summary, `${label} has accessibility violations`).toEqual([]);
}

/**
 * Waits until the page has drawn its content: the loading skeleton is gone and
 * the title is up. (Not "network idle": Firestore keeps a connection open.)
 */
async function settle(page: Page) {
  await expect(page.locator("main h1")).toBeVisible();
  await expect(page.locator("main .animate-pulse")).toHaveCount(0);
  await page.waitForTimeout(300);
}

/** Opens a roster tile's quick view, waits for its animation, and checks it. */
async function expectQuickViewClean(page: Page, tile: string, label: string) {
  await page.goto("/genshin/characters");
  await settle(page);
  await page.locator(tile).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.waitForTimeout(300);
  await expectNoViolations(page, label);
}

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test("signed-out pages", async ({ page }) => {
      for (const route of ["/", "/login", "/create-account", "/forgot-password", "/about", "/contact", "/features", "/genshin/characters", "/genshin/weapons", "/genshin/artifacts", "/genshin/wishes"]) {
        await page.goto(route);
        await settle(page);
        await expectNoViolations(page, route);
      }
    });

    test("the signed-out quick view", async ({ page }) => {
      await expectQuickViewClean(page, 'main [title="Hu Tao (not owned)"]', "quick view");
      // The Traveler's has the element dropdown instead of an element chip.
      await expectQuickViewClean(page, 'main [title^="Traveler"]', "the Traveler's quick view");
      await page.getByRole("combobox", { name: "Your Traveler's element" }).click();
      await page.getByRole("option", { name: "Hydro" }).click();
      await expect(page.getByText("Vaporize (Pyro + Hydro):")).toBeVisible();
      await expectNoViolations(page, "the Traveler's quick view with an element");
    });

    test("login and sign-up errors", async ({ page }) => {
      await page.goto("/login");
      await page.locator("#identifier").fill("nobody@example.test");
      await page.locator("#password").fill("wrong-password");
      await page.getByRole("button", { name: "Log in" }).click();
      await expect(formError(page)).toBeVisible();
      await expectNoViolations(page, "/login with an error");

      await page.goto("/create-account");
      await page.locator("#username").fill("someone");
      await page.locator("#email").fill("someone@example.test");
      await page.locator("#password").fill("pw-123456");
      await page.locator("#confirm-password").fill("pw-different");
      await page.getByRole("button", { name: "Create account" }).click();
      await expect(formError(page)).toBeVisible();
      await expectNoViolations(page, "/create-account with an error");
    });

    test("signed-in pages and the upload error", async ({ page }) => {
      await logIn(page, await createUser());
      await uploadSample(page);
      for (const route of [
        "/dashboard",
        "/genshin",
        "/genshin/characters",
        "/genshin/characters/Aino",
        "/genshin/characters/Traveler",
        "/genshin/weapons",
        "/genshin/weapons/FavoniusWarbow",
        "/genshin/artifacts",
        "/genshin/wishes",
        "/profile",
      ]) {
        await page.goto(route);
        await settle(page);
        await expectNoViolations(page, route);
      }

      await expectQuickViewClean(page, 'main [title$="(not owned)"]', "signed-in quick view");

      await page.goto("/genshin");
      await uploadText(page, "[1, 2, 3]");
      await expect(page.getByRole("alert").filter({ hasText: "Upload failed" })).toBeVisible();
      await expectNoViolations(page, "/genshin with an upload error");
    });
  });
}
