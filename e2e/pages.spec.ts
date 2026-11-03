import { expect, test, type Page } from "@playwright/test";
import { createUser, logIn, uploadSample } from "./helpers";

test.describe("signed out", () => {
  test("the home page hero leads to the sample account", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Try the sample account" }).click();
    await expect(page).toHaveURL(/#sample$/);
    const sample = page.locator("#sample");
    await expect(sample.getByText("Character Showcase")).toBeVisible();
    await expect(sample.getByRole("link", { name: /Sign up to see yours/ }).first()).toHaveAttribute(
      "href",
      "/create-account"
    );
  });

  test("the roster shows every character as not owned", async ({ page }) => {
    await page.goto("/genshin/characters");
    await expect(page.getByRole("heading", { level: 1, name: "Characters" })).toBeVisible();
    await expect(page.locator('[title$="(not owned)"]').first()).toBeVisible();
    await expect(page.locator('main a[href^="/genshin/characters/"]')).toHaveCount(0);
  });

  test("old addresses redirect to the Genshin section", async ({ page }) => {
    for (const [from, to] of [
      ["/characters", "/genshin/characters"],
      ["/characters/Aino", "/genshin/characters/Aino"],
      ["/weapons", "/genshin/weapons"],
      ["/artifacts", "/genshin/artifacts"],
    ]) {
      await page.goto(from);
      expect(new URL(page.url()).pathname, from).toBe(to);
    }
  });
});

test.describe("signed in with the sample upload", () => {
  // One account and upload for the whole group; each test opens its own page.
  test.describe.configure({ mode: "serial" });
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await logIn(page, await createUser());
    await uploadSample(page);
  });
  test.afterAll(async () => {
    await page.close();
  });

  test("the roster marks owned characters and filters them", async () => {
    await page.goto("/genshin/characters");
    const owned = page.locator('main a[href^="/genshin/characters/"]');
    await expect(owned.first()).toBeVisible();
    const ownedCount = await owned.count();
    expect(ownedCount).toBeGreaterThan(80);

    await page.locator("#owned-filter").click();
    await page.getByRole("option", { name: "Not owned" }).click();
    await expect(owned).toHaveCount(0);
    await page.locator("#owned-filter").click();
    await page.getByRole("option", { name: "Owned", exact: true }).click();
    await expect(owned).toHaveCount(ownedCount);
  });

  test("a character page shows the character, weapon and artifacts", async () => {
    await page.goto("/genshin/characters/Aino");
    await expect(page.getByRole("heading", { level: 1, name: "Aino" })).toBeVisible();
    await expect(page.getByText("Level: 70")).toBeVisible();
    await expect(page.getByText("Flame-Forged Insight")).toBeVisible();
    await expect(page.getByText("4-star")).toBeAttached();
    await expect(page.getByText("Silken Moon's Serenade").first()).toBeVisible();
    await expect(page.getByText("Flower of Life · 5★ · Lv. 20")).toBeVisible();
  });

  test("a character that isn't in the upload says so", async () => {
    await page.goto("/genshin/characters/NotARealOne");
    await expect(page.getByText("You don't have this character in your latest upload.")).toBeVisible();
  });

  test("the weapons page searches, filters and switches to a table", async () => {
    await page.goto("/genshin/weapons");
    await expect(page.getByText("Showing 162 entries")).toBeVisible();

    await page.getByPlaceholder("Search weapons").fill("Amos");
    await expect(page.getByText("Amos' Bow").first()).toBeVisible();
    // Real icons, not the placeholder.
    await expect(page.locator('main img[src*="weapon-icons%2Famosbow.webp"]').first()).toBeVisible();
    await expect(page.getByText("Aquila Favonia")).toHaveCount(0);
    await page.getByPlaceholder("Search weapons").fill("");

    await page.getByRole("button", { name: "Group copies" }).or(page.getByLabel("Group copies")).click();
    await expect(page.getByText("Showing 336 entries")).toBeVisible();

    await page.getByRole("button", { name: "Table" }).click();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /Weapon/ })).toBeVisible();
  });

  test("the artifacts page opens on Equipped and pages the full list", async () => {
    await page.goto("/genshin/artifacts");
    const show = page.getByRole("group", { name: "Show" });
    await expect(show.getByRole("button", { name: "Equipped (378)" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("link", { name: "Aino" })).toBeVisible();
    // Each piece shows its set's icon for its slot.
    await expect(page.locator('main img[src*="artifact-icons%2Fsilkenmoonsserenade-flower.webp"]').first()).toBeVisible();

    await show.getByRole("button", { name: "All (1,717)" }).click();
    await expect(page.getByRole("button", { name: "Show 60 more" })).toBeVisible();

    await page.locator("#artifact-set").click();
    const set = page.getByRole("option", { name: /^Silken Moon's Serenade \(\d+\)$/ });
    await set.click();
    await expect(page.locator("#artifact-set")).toContainText("Silken Moon's Serenade");
  });

  test("the profile shows the account and links back to the hub", async () => {
    await page.goto("/profile");
    await expect(page.getByText("Last upload")).toBeVisible();
    await page.getByRole("link", { name: "Back to your games" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
