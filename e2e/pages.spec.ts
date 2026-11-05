import { expect, test, type Page } from "@playwright/test";
import { createUser, logIn, uploadSample } from "./helpers";

test.describe("signed out", () => {
  test("the home page hero leads to the sample account", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Try the sample account" }).click();
    await expect(page).toHaveURL(/#sample$/);
    const sample = page.locator("#sample");
    await expect(sample.getByText("Character Showcase")).toBeVisible();
    // The count tiles open the real (signed-out) pages.
    await sample.getByRole("link", { name: /Weapons[\s\S]*Open/ }).click();
    await expect(page).toHaveURL(/\/genshin\/weapons$/);
  });

  test("the roster shows every character as not owned, with a log-in banner", async ({ page }) => {
    await page.goto("/genshin/characters");
    await expect(page.getByRole("heading", { level: 1, name: "Characters" })).toBeVisible();
    await expect(page.getByText("You're not logged in.")).toBeVisible();
    await expect(page.locator("main").getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
    await expect(page.locator('[title$="(not owned)"]').first()).toBeVisible();
    await expect(page.locator('main a[href^="/genshin/characters/"]')).toHaveCount(0);
  });

  test("the roster filters by element, weapon, rarity, playstyle and region", async ({ page }) => {
    await page.goto("/genshin/characters");
    const tiles = page.locator('main [title$="(not owned)"]');
    await expect(tiles.first()).toBeVisible();
    const all = await tiles.count();
    const chip = (group: string, name: string) =>
      page.getByRole("group", { name: `Filter by ${group}` }).getByRole("button", { name, exact: true });
    // Playstyle and Region are tick-box menus.
    const tick = async (menu: string, name: string) => {
      await page.getByRole("button", { name: new RegExp(`^${menu}`) }).click();
      await page.getByRole("menuitemcheckbox", { name }).click();
      await page.keyboard.press("Escape");
    };

    // An element chip replaces the current one; across groups they narrow (and Main DPS).
    await chip("element", "Hydro").click();
    await expect(chip("element", "Hydro")).toHaveAttribute("aria-pressed", "true");
    expect(await tiles.count()).toBeLessThan(all);
    await chip("element", "Pyro").click();
    await expect(chip("element", "Pyro")).toHaveAttribute("aria-pressed", "true");
    await expect(chip("element", "Hydro")).toHaveAttribute("aria-pressed", "false");
    await tick("Playstyle", "Main DPS");
    await expect(page.getByText(/^Showing \d+ of \d+ characters\.$/)).toBeVisible();
    await expect(page.locator('main [title="Hu Tao (not owned)"]')).toBeVisible();
    await expect(page.locator('main [title="Bennett (not owned)"]')).toHaveCount(0);
    // Playstyle choices still add up.
    await tick("Playstyle", "Support");
    await expect(page.locator('main [title="Bennett (not owned)"]')).toBeVisible();

    await page.getByRole("button", { name: "Clear filters (3)" }).click();
    await expect(tiles).toHaveCount(all);
    await tick("Region", "Fontaine");
    await chip("weapon", "Catalyst").click();
    await chip("rarity", "5★").click();
    await expect(page.locator('main [title="Neuvillette (not owned)"]')).toBeVisible();
  });

  test("a roster tile opens a quick view with a log-in prompt", async ({ page }) => {
    await page.goto("/genshin/characters");
    await page.locator('main [title="Hu Tao (not owned)"]').click();
    const dialog = page.getByRole("dialog", { name: "Hu Tao" });
    await expect(dialog.getByText("Vaporize (Pyro + Hydro):")).toBeVisible();
    await dialog.getByRole("button", { name: "Melt" }).click();
    await expect(dialog.getByText("Melt (Pyro + Cryo):")).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Log in" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });

  for (const [route, empty] of [
    ["/genshin/weapons", "No weapons to show yet."],
    ["/genshin/artifacts", "No artifacts to show yet."],
  ]) {
    test(`${route} shows an empty page with a log-in banner`, async ({ page }) => {
      await page.goto(route);
      await expect(page.getByText("You're not logged in.")).toBeVisible();
      await expect(page.getByText(empty)).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`${route}$`));
      await page.locator("main").getByRole("link", { name: "Create account" }).click();
      await expect(page).toHaveURL(/\/create-account$/);
    });
  }

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

    const show = page.getByRole("group", { name: "Show" });
    await show.getByRole("button", { name: "Not owned" }).click();
    await expect(owned).toHaveCount(0);
    await show.getByRole("button", { name: "Owned", exact: true }).click();
    await expect(owned).toHaveCount(ownedCount);
    await show.getByRole("button", { name: "All", exact: true }).click();

    await page.getByPlaceholder("Search characters").fill("Aino");
    await expect(owned).toHaveCount(1);
  });

  test("owned roster tiles show the build, and sorting keeps owned characters first", async () => {
    await page.goto("/genshin/characters");
    const owned = page.locator('main a[href^="/genshin/characters/"]');
    const aino = owned.filter({ hasText: "Aino" });
    await expect(aino).toContainText("Lv 70 · C6");
    await expect(aino).toContainText("1/1/1");

    await page.locator("#sort-order").click();
    await page.getByRole("option", { name: "Level (Low to High)" }).click();
    const firstTile = page.locator("main").locator('a[href^="/genshin/characters/"], [title$="(not owned)"]').first();
    await expect(firstTile).not.toHaveAttribute("title", /\(not owned\)$/);
  });

  test("on a phone the roster's filters open from a Filters button", async () => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/genshin/characters");
    const pyro = page.getByRole("button", { name: "Pyro", exact: true });
    await expect(pyro).toBeHidden();
    await page.getByRole("button", { name: "Filters" }).click();
    await pyro.click();
    await expect(page.getByRole("button", { name: "Filters (1)", exact: true })).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test("a character that isn't owned opens a quick view without a log-in prompt", async () => {
    await page.goto("/genshin/characters");
    await page.locator('main [title$="(not owned)"]').first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("You don't have this character in your latest upload.")).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Log in" })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });

  test("a character page shows the profile, weapon, talents and artifacts", async () => {
    await page.goto("/genshin/characters/Aino");
    await expect(page.getByRole("heading", { level: 1, name: "Aino" })).toBeVisible();
    // Profile card: title, element, region, playstyle and level.
    await expect(page.getByText("Clinky-Clank Gadgets-A-Gogo", { exact: true })).toBeVisible();
    await expect(page.getByText("Hydro", { exact: true })).toBeVisible();
    await expect(page.getByText("Nod-Krai", { exact: true })).toBeVisible();
    await expect(page.getByText("Playstyle", { exact: true })).toBeVisible();
    await expect(page.getByText("Lv. 70", { exact: true })).toBeVisible();
    // Reactions: the main one's note shows, and pressing another chip swaps it.
    await expect(page.getByText("Lunar-Charged (Electro + Hydro):")).toBeVisible();
    await page.getByRole("button", { name: "Lunar-Bloom" }).click();
    await expect(page.getByText("Lunar-Bloom (Dendro + Hydro):")).toBeVisible();
    // Weapon: name, stats and passive, with the refinement buttons.
    const weapon = page.locator("section", { has: page.getByRole("heading", { name: "Weapon" }) });
    await expect(weapon.getByText("Flame-Forged Insight", { exact: true })).toBeVisible();
    await expect(weapon.getByText(/^Base ATK \d+$/)).toBeVisible();
    await expect(weapon.getByText(/^Elemental Mastery \d+$/)).toBeVisible();
    await expect(weapon.getByText(/^Mind in Bloom/)).toBeVisible();
    const refinement = weapon.getByRole("group", { name: "Refinement" });
    await expect(refinement.getByRole("button", { name: "R5 (yours)" })).toHaveAttribute("aria-pressed", "true");
    await refinement.getByRole("button", { name: "R1", exact: true }).click();
    await expect(refinement.getByRole("button", { name: "R1", exact: true })).toHaveAttribute("aria-pressed", "true");
    // Talents with their names, artifacts with set bonuses and full stats.
    await expect(page.getByText("Musecatcher", { exact: true })).toBeVisible();
    await expect(page.getByText("4-piece · Silken Moon's Serenade", { exact: true })).toBeVisible();
    await expect(page.getByText("Silken Moon's Serenade", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("CRIT DMG 13.2%").first()).toBeVisible();
  });

  test("a character that isn't in the upload says so", async () => {
    await page.goto("/genshin/characters/NotARealOne");
    await expect(page.getByText("You don't have this character in your latest upload.")).toBeVisible();
  });

  test("the Traveler's page shows reactions for the picked element and remembers it", async () => {
    await page.goto("/genshin/characters/Traveler");
    const element = page.getByRole("combobox", { name: "Your Traveler's element" });
    await expect(element).toHaveText("Choose your element");
    await element.click();
    await page.getByRole("option", { name: "Hydro" }).click();
    await expect(page.getByText("Vaporize (Pyro + Hydro):")).toBeVisible();
    await page.reload();
    await expect(element).toHaveText("Hydro");
    await expect(page.getByText("Vaporize (Pyro + Hydro):")).toBeVisible();
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

    const bow = page.getByRole("group", { name: "Filter by weapon type" }).getByRole("button", { name: "Bow" });
    await bow.click();
    await page.getByRole("group", { name: "Filter by rarity" }).getByRole("button", { name: "5★" }).click();
    await expect(page.getByText("Skyward Harp")).toBeVisible();
    await expect(page.getByText("Aquila Favonia")).toHaveCount(0);
    await page.getByRole("button", { name: "Clear filters (2)" }).click();
    await expect(page.getByText("Showing 162 entries")).toBeVisible();

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
    await page.getByPlaceholder("Search by character").fill("Xiao");
    await expect(page.getByText("Showing 1 of 81 characters")).toBeVisible();
    await expect(page.getByRole("link", { name: "Aino" })).toHaveCount(0);
    await page.getByPlaceholder("Search by character").fill("");
    // Each piece shows its set's icon for its slot.
    await expect(page.locator('main img[src*="artifact-icons%2Fsilkenmoonsserenade-flower.webp"]').first()).toBeVisible();

    await show.getByRole("button", { name: "All (1,717)" }).click();
    await expect(page.getByRole("button", { name: "Show 60 more" })).toBeVisible();

    await page.locator("#artifact-set").click();
    const set = page.getByRole("option", { name: /^Silken Moon's Serenade \(\d+\)$/ });
    await set.click();
    await expect(page.locator("#artifact-set")).toContainText("Silken Moon's Serenade");

    // Slot and main stat narrow it further; main stat hides for a slot with only one.
    await page.getByRole("button", { name: "Clear filters (1)" }).click();
    await page.getByRole("group", { name: "Filter by slot" }).getByRole("button", { name: "Goblet" }).click();
    await page.locator("#artifact-main-stat").click();
    await page.getByRole("option", { name: /^Pyro DMG Bonus \(\d+\)$/ }).click();
    await expect(page.getByText("Goblet of Eonothem").first()).toBeVisible();
    await page.getByRole("group", { name: "Filter by slot" }).getByRole("button", { name: "Flower" }).click();
    await expect(page.locator("#artifact-main-stat")).toHaveCount(0);
  });

  test("the profile shows the account and links back to the hub", async () => {
    await page.goto("/profile");
    await expect(page.getByText("Last upload")).toBeVisible();
    await page.getByRole("link", { name: "Back to your games" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
