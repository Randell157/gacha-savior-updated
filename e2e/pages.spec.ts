import { expect, test, type Page } from "@playwright/test";
import { createUser, logIn, uploadSample } from "./helpers";

test.describe("signed out", () => {
  test("the home page hero leads to the sample account", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Try the sample account" }).click();
    await expect(page).toHaveURL(/#sample$/);
    const sample = page.locator("#sample");
    await expect(sample.getByRole("heading", { name: "Showcase" })).toBeVisible();
    // The count tiles open the real (signed-out) pages.
    await sample.getByRole("link", { name: /^Weapons/ }).click();
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
    // Talents open on press, base stats show at level 90, and constellations carry no marks.
    await dialog.getByRole("button", { name: /Guide to Afterlife/ }).click();
    await expect(dialog.locator("#quick-view-talent")).toBeVisible();
    await expect(dialog.getByText("Base stats at Lv. 90, before gear")).toBeVisible();
    await expect(dialog.getByRole("group", { name: "Constellation" }).getByRole("button", { name: "C1", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(dialog.getByRole("link", { name: "Log in" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });

  for (const [route, empty] of [
    ["/genshin/weapons", "No weapons to show yet."],
    ["/genshin/artifacts", "No artifacts to show yet."],
    ["/genshin/planner", "Your plans will show up here."],
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

  test("with reduce motion on, dialogs only fade", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/genshin/characters");
    await page.getByRole("button", { name: /^Valeriy/ }).click();
    const name = await page.getByRole("dialog").evaluate((dialog) => getComputedStyle(dialog).animationName);
    expect(name).toBe("gs-fade");
  });

  test("marked game text shows in bold, without its asterisks", async ({ page }) => {
    await page.goto("/genshin/characters");
    await page.getByRole("button", { name: /^Valeriy/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.locator("strong").first()).toBeVisible();
    await expect(dialog).not.toContainText("**");
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
  // Filters are remembered for the browser tab, and this group shares one.
  test.beforeEach(async () => {
    await page.evaluate(() => sessionStorage.clear());
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

  test("the roster sorts by release and by the order characters were obtained", async () => {
    await page.goto("/genshin/characters");
    const tiles = page.locator("main").locator('a[href^="/genshin/characters/"], [title$="(not owned)"]');

    await page.locator("#sort-order").click();
    await page.getByRole("option", { name: "Release (Oldest First)" }).click();
    await expect(tiles.first()).toContainText("Version 1.0");

    // The Irminsul sample lists the Traveler first, then Amber, then Fischl.
    await page.locator("#sort-order").click();
    await page.getByRole("option", { name: "Obtained (Oldest First)" }).click();
    await expect(tiles.nth(0)).toContainText("Traveler");
    await expect(tiles.nth(0)).toContainText("#1");
    await expect(tiles.nth(1)).toContainText("Amber");
    await expect(tiles.nth(2)).toContainText("Fischl");

    await page.locator("#sort-order").click();
    await page.getByRole("option", { name: "Obtained (Newest First)" }).click();
    await expect(tiles.first()).not.toHaveAttribute("title", /\(not owned\)$/);
    await expect(tiles.first()).toContainText("Illuga");
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
    // Focus goes back to the tile that opened it.
    await expect(page.locator('main button[title$="(not owned)"]').first()).toBeFocused();
  });

  test("keyboard users can skip the roster's filters", async () => {
    await page.goto("/genshin/characters");
    await page.getByPlaceholder("Search characters").focus();
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to characters" });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#roster").locator("a, button").first()).toBeFocused();
  });

  test("roster filters and sort come back after leaving the page", async () => {
    await page.goto("/genshin/characters");
    const hydro = page.getByRole("group", { name: "Filter by element" }).getByRole("button", { name: "Hydro", exact: true });
    await hydro.click();
    await page.locator("#sort-order").click();
    await page.getByRole("option", { name: "Level (Low to High)" }).click();

    // Back from a character.
    await page.locator('main a[href="/genshin/characters/Furina"]').click();
    await expect(page.getByRole("heading", { level: 1, name: "Furina" })).toBeVisible();
    await page.goBack();
    await expect(hydro).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#sort-order")).toContainText("Level (Low to High)");

    // By the section's tabs, and after a refresh.
    await page.getByRole("link", { name: "Weapons", exact: true }).click();
    await expect(page).toHaveURL(/\/genshin\/weapons$/);
    await page.getByRole("link", { name: "Characters", exact: true }).click();
    await expect(hydro).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(hydro).toHaveAttribute("aria-pressed", "true");
  });

  test("a character page steps through what the roster is showing", async () => {
    await page.goto("/genshin/characters");
    await page.getByRole("group", { name: "Filter by element" }).getByRole("button", { name: "Hydro", exact: true }).click();
    await page.locator('main a[href="/genshin/characters/Furina"]').click();
    const others = page.getByRole("navigation", { name: "Other characters" });
    await expect(others.getByText("5 of 12")).toBeVisible();
    await others.getByRole("link", { name: "Next character: Mona" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Mona" })).toBeVisible();
    await expect(others.getByText("6 of 12")).toBeVisible();
    // The same buttons wait at the bottom of the page.
    await expect(page.getByRole("navigation", { name: "Previous and next character" }).getByText("6 of 12")).toBeVisible();

    // A character the filter leaves out steps through everyone owned.
    await page.goto("/genshin/characters/Ganyu");
    await expect(others.getByText(/ of 91$/)).toBeVisible();
  });

  test("a character page shows the profile, weapon, talents and artifacts", async () => {
    await page.goto("/genshin/characters/Aino");
    await expect(page.getByRole("heading", { level: 1, name: "Aino" })).toBeVisible();
    // Profile card: title, element, region, playstyle and level.
    await expect(page.getByText("Clinky-Clank Gadgets-A-Gogo", { exact: true })).toBeVisible();
    await expect(page.getByText("Hydro", { exact: true })).toBeVisible();
    await expect(page.getByText("Nod-Krai", { exact: true })).toBeVisible();
    await expect(page.getByText("Playstyle", { exact: true })).toBeVisible();
    // Build strip and base stats at the character's level.
    await expect(page.getByText("Base stats at Lv. 70, before gear")).toBeVisible();
    await expect(page.getByText("Ascension", { exact: true })).toBeVisible();
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
    // Pressing a talent opens its description, and pressing it again closes it.
    const talent = page.getByRole("button", { name: /Musecatcher/ });
    await talent.click();
    await expect(talent).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#character-talent")).toBeVisible();
    await talent.click();
    await expect(page.locator("#character-talent")).toHaveCount(0);
    // Constellations: picking one shows its effect.
    const constellations = page.getByRole("group", { name: "Constellation" });
    await constellations.getByRole("button", { name: /^C6/ }).click();
    await expect(constellations.getByRole("button", { name: /^C6/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText(/C6 · (Unlocked|Next to unlock|Locked)/)).toBeVisible();
    // Artifacts with set bonuses and full stats.
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
    await expect(page.getByText("Choose your element above")).toBeVisible();
    await element.click();
    await page.getByRole("option", { name: "Hydro" }).click();
    await expect(page.getByText("Vaporize (Pyro + Hydro):")).toBeVisible();
    // The talents follow the element.
    await expect(page.getByRole("button", { name: /Aquacrest Saber/ })).toBeVisible();
    await page.reload();
    await expect(element).toHaveText("Hydro");
    await expect(page.getByText("Vaporize (Pyro + Hydro):")).toBeVisible();
  });

  test("the weapons page searches, filters and switches to a table", async () => {
    await page.goto("/genshin/weapons");
    await expect(page.getByText("Showing 60 of 162 entries (336 weapons)")).toBeVisible();
    await page.getByRole("button", { name: "Show 60 more" }).click();
    await expect(page.getByText("Showing 120 of 162 entries (336 weapons)")).toBeVisible();

    await page.getByPlaceholder("Search weapons").fill("Amos");
    // Phones get slim rows in place of the cards, so the page holds both and shows one.
    await expect(page.getByText("Amos' Bow").locator("visible=true").first()).toBeVisible();
    // Real icons, not the placeholder.
    await expect(page.locator('main img[src*="weapon-icons%2Famosbow.webp"]').locator("visible=true").first()).toBeVisible();
    await expect(page.getByText("Aquila Favonia")).toHaveCount(0);

    // An empty list offers the way out beside its message.
    await page.getByPlaceholder("Search weapons").fill("no such weapon");
    await expect(page.getByText("No weapons match these filters.")).toBeVisible();
    await page.getByRole("button", { name: "Clear search" }).click();
    await expect(page.getByPlaceholder("Search weapons")).toHaveValue("");

    const bow = page.getByRole("group", { name: "Filter by weapon type" }).getByRole("button", { name: "Bow" });
    await bow.click();
    await page.getByRole("group", { name: "Filter by rarity" }).getByRole("button", { name: "5★" }).click();
    await expect(page.getByText("Skyward Harp").locator("visible=true").first()).toBeVisible();
    await expect(page.getByText("Aquila Favonia")).toHaveCount(0);
    await page.getByRole("button", { name: "Clear filters (2)" }).click();
    await expect(page.getByText("Showing 60 of 162 entries (336 weapons)")).toBeVisible();

    await page.getByRole("button", { name: "Group copies" }).or(page.getByLabel("Group copies")).click();
    await expect(page.getByText("Showing 60 of 336 weapons")).toBeVisible();

    await page.getByRole("button", { name: "Table" }).click();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /Weapon/ })).toBeVisible();

    // The Table view stays on this device, even in a new tab's session.
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await expect(page.getByRole("table")).toBeVisible();
    await page.getByRole("button", { name: "Cards" }).click();
  });

  test("a weapon's page shows its passive and every copy, and is reached from the list and the character page", async () => {
    // The whole card opens the page.
    await page.goto("/genshin/weapons");
    await page.getByPlaceholder("Search weapons").fill("Favonius Warbow");
    await page.locator('main a[href="/genshin/weapons/FavoniusWarbow"]').locator("visible=true").first().click();
    await expect(page.getByRole("heading", { level: 1, name: "Favonius Warbow" })).toBeVisible();

    // Identical copies merge, strongest first, each with its own numbers.
    await expect(page.getByRole("heading", { name: "Your 10 copies" })).toBeVisible();
    // Only the copies table: the Plan section below has a table of its own.
    const rows = page.locator("section", { has: page.getByRole("heading", { name: "Your 10 copies" }) }).locator("tbody tr");
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText("Yelan");
    await expect(rows.nth(0)).toContainText("454");
    await expect(rows.nth(0)).toContainText("61.3%");
    await expect(rows.nth(1)).toContainText("Kujou Sara");
    await expect(rows.nth(2)).toContainText("Not equipped");
    await expect(rows.nth(2)).toContainText("×8");

    // The passive opens on the highest refinement owned, with a star on each one owned.
    const refinement = page.getByRole("group", { name: "Refinement" });
    await expect(refinement.getByRole("button", { name: "R5 (yours)" })).toHaveAttribute("aria-pressed", "true");
    await expect(refinement.getByRole("button", { name: "R4", exact: true })).toBeVisible();
    await expect(page.getByText("100%", { exact: true })).toBeVisible();
    await refinement.getByRole("button", { name: "R3 (yours)" }).click();
    await expect(page.getByText("80%", { exact: true })).toBeVisible();

    // A holder's row leads to them, and their Weapon panel leads back.
    await rows.nth(1).getByRole("link", { name: "Kujou Sara" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Kujou Sara" })).toBeVisible();
    await page.locator("section", { has: page.getByRole("heading", { name: "Weapon" }) })
      .getByRole("link", { name: "Favonius Warbow" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Favonius Warbow" })).toBeVisible();

    await page.goto("/genshin/weapons/AmosBow");
    await expect(page.getByRole("heading", { name: "Your copy" })).toBeVisible();

    // Leave the list as the next test expects it.
    await page.goto("/genshin/weapons");
    await page.getByPlaceholder("Search weapons").fill("");
  });

  test("the weapons list keeps what it had drawn after visiting a weapon", async () => {
    await page.goto("/genshin/weapons");
    await page.getByRole("button", { name: "Show 60 more" }).click();
    await expect(page.getByText("Showing 120 of 162 entries (336 weapons)")).toBeVisible();
    await page.locator('main a[href="/genshin/weapons/AmosBow"]').locator("visible=true").first().click();
    await expect(page.getByRole("heading", { level: 1, name: "Amos' Bow" })).toBeVisible();
    await page.goBack();
    await expect(page.getByText("Showing 120 of 162 entries (336 weapons)")).toBeVisible();
  });

  test("a weapon that isn't in the upload says so", async () => {
    await page.goto("/genshin/weapons/NotARealWeapon");
    await expect(page.getByText("You don't have this weapon in your latest upload.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to Weapons" })).toBeVisible();
  });

  test("on a phone the weapons page's filters open from a Filters button", async () => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/genshin/weapons");
    const bow = page.getByRole("group", { name: "Filter by weapon type" }).getByRole("button", { name: "Bow" });
    await expect(bow).toBeHidden();
    await page.getByRole("button", { name: "Filters" }).click();
    await bow.click();
    await expect(page.getByRole("button", { name: "Filters (1)", exact: true })).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test("the artifacts page opens on Equipped and pages the full list", async () => {
    await page.goto("/genshin/artifacts");
    const show = page.getByRole("group", { name: "Show" });
    await expect(show.getByRole("button", { name: "Equipped (378)" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("link", { name: "Aino" })).toBeVisible();
    await page.getByPlaceholder("Search by character").fill("Xiao");
    await expect(page.getByText("Showing 1 of 91 characters")).toBeVisible();
    await expect(page.getByRole("link", { name: "Aino" })).toHaveCount(0);
    await page.getByPlaceholder("Search by character").fill("");

    // Every owned character has a row, filtered by how many pieces they have on.
    const pieces = page.getByRole("group", { name: "Filter by how many pieces are equipped" });
    await pieces.getByRole("button", { name: "No artifacts (10)" }).click();
    await expect(page.getByText("Showing 10 of 91 characters")).toBeVisible();
    await expect(page.getByRole("link", { name: "Aloy" })).toBeVisible();
    await expect(page.getByText("0 of 5 equipped").locator("visible=true").first()).toBeVisible();
    await pieces.getByRole("button", { name: "Missing pieces (12)" }).click();
    await expect(page.getByText("Showing 12 of 91 characters")).toBeVisible();
    await expect(page.getByRole("link", { name: "Chongyun" })).toBeVisible();
    await pieces.getByRole("button", { name: "Fully equipped (69)" }).click();
    await expect(page.getByRole("link", { name: "Aino" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Chongyun" })).toHaveCount(0);
    await page.getByRole("button", { name: "Clear filters (1)" }).click();
    await expect(page.getByRole("link", { name: "Chongyun" })).toBeVisible();

    // Each piece shows its set's icon for its slot.
    await expect(page.locator('main img[src*="artifact-icons%2Fsilkenmoonsserenade-flower.webp"]').locator("visible=true").first()).toBeVisible();

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

  test("the artifacts page scores pieces and finds the best and worst", async () => {
    await page.goto("/genshin/artifacts");
    const show = page.getByRole("group", { name: "Show" });

    // Equipped rows have a chip on each piece and a total, which can set the order.
    await expect(page.getByText(/^Total CV /).locator("visible=true").first()).toBeVisible();
    await expect(page.getByText(/^CV \d/).locator("visible=true").first()).toBeVisible();
    await page.locator("#equipped-sort").click();
    await page.getByRole("option", { name: "Total CV (High to Low)" }).click();
    await expect(page.locator("section").filter({ hasText: "Total CV" }).first()).toContainText("Skirk");

    // The summary's numbers come from the Irminsul sample.
    await show.getByRole("button", { name: "All (1,717)" }).click();
    await expect(page.getByRole("button", { name: /^21\.2 Equipped average CV/ })).toBeVisible();

    // Each tile leads to its pieces: 4 Excellent in the bag, and 60 likely fodder, weakest first.
    await page.getByRole("button", { name: /^4 Excellent, not equipped/ }).click();
    await expect(show.getByRole("button", { name: /^Unequipped/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("Showing 4 of 4")).toBeVisible();
    await expect(page.locator("#artifact-sort")).toContainText("Crit Value (High to Low)");
    await page.getByRole("button", { name: /^60 Likely fodder.*19 unlocked/ }).click();
    await expect(page.getByText("Showing 60 of 60")).toBeVisible();
    await expect(page.locator("#artifact-sort")).toContainText("Crit Value (Low to High)");

    // The Lock filter narrows it to the pieces that are free to use up.
    await page.getByRole("group", { name: "Filter by lock" }).getByRole("button", { name: "Unlocked" }).click();
    await expect(page.getByText("Showing 19 of 19")).toBeVisible();
    await page.getByRole("button", { name: "Clear filters (2)" }).click();

    // A CRIT circlet keeps its CV but gets no tier, so it stays out of Low.
    await page.getByRole("group", { name: "Filter by score" }).getByRole("button", { name: "CRIT circlet" }).click();
    await expect(page.getByText("CRIT circlet", { exact: true }).nth(1)).toBeVisible();

    // The average tile leads back to Equipped, by total.
    await page.getByRole("button", { name: /Equipped average CV/ }).click();
    await expect(show.getByRole("button", { name: "Equipped (378)" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#equipped-sort")).toContainText("Total CV (High to Low)");
  });

  test("on a phone, Equipped rows fold and open", async () => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/genshin/artifacts");
    const row = page.getByRole("button", { name: /^Aino/ });
    await expect(row).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("link", { name: "Open Aino's page" })).toBeHidden();
    await row.click();
    await expect(row).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("link", { name: "Open Aino's page" })).toBeVisible();
    await expect(page.getByText("CRIT DMG 13.2%").locator("visible=true").first()).toBeVisible();
    // One opens at a time, and the pressed row stays in view.
    const other = page.getByRole("button", { name: /^Candace/ });
    await other.click();
    await expect(other).toHaveAttribute("aria-expanded", "true");
    await expect(row).toHaveAttribute("aria-expanded", "false");
    await expect(other).toBeInViewport();
    // A character with nothing equipped has nothing to open; the row goes to their page.
    await page.getByRole("link", { name: /^Aloy/ }).locator("visible=true").first().click();
    await expect(page).toHaveURL(/\/genshin\/characters\/Aloy$/);
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test("Profile picks a character as the picture, shown in the header too", async () => {
    await page.goto("/profile");
    const headerPortrait = page.getByRole("banner").locator('img[src*="Aino_Icon"]');
    await expect(headerPortrait).toHaveCount(0);
    await page.getByRole("button", { name: "Choose character" }).click();
    await page.getByLabel("Search characters").fill("Aino");
    await page.getByLabel("Search characters").press("Enter");
    await expect(headerPortrait).toBeVisible();

    await page.reload();
    await expect(headerPortrait).toBeVisible();

    await page.getByRole("button", { name: "Remove picture" }).click();
    await expect(headerPortrait).toHaveCount(0);
  });

  test("Profile crops an uploaded image, and refuses what it can't use", async () => {
    await page.goto("/profile");
    const input = page.getByLabel("Upload a profile picture");

    await input.setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
    await expect(page.getByRole("alert").filter({ hasText: "JPG, PNG or WebP" })).toBeVisible();

    // A 1 × 1 PNG.
    const tiny = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg==",
      "base64"
    );
    await input.setInputFiles({ name: "tiny.png", mimeType: "image/png", buffer: tiny });
    await expect(page.getByRole("alert").filter({ hasText: "too small" })).toBeVisible();

    await input.setInputFiles("public/genshinappicon.png");
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Uses 256 × 256 px of your 256 × 256 px image (100%).")).toBeVisible();
    await dialog.getByLabel("Zoom").fill("2");
    await expect(dialog.getByText("Uses 128 × 128 px of your 256 × 256 px image (25%).")).toBeVisible();
    await dialog.getByRole("button", { name: "Save picture" }).click();
    await expect(dialog).toBeHidden();
    const headerPicture = page.getByRole("banner").locator('img[src^="data:image/jpeg"]');
    await expect(headerPicture).toBeVisible();

    await page.reload();
    await expect(headerPicture).toBeVisible();
    await page.getByRole("button", { name: "Remove picture" }).click();
    await expect(headerPicture).toHaveCount(0);
  });

  test("the showcase picker takes a typed name, and Enter picks the first match", async () => {
    await page.goto("/genshin");
    await page.getByRole("button", { name: "Choose characters" }).click();
    const search = page.getByRole("textbox", { name: "Search characters" });
    await expect(search).toBeFocused();
    await page.keyboard.type("amb");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Change character for slot 1" })).toBeFocused();
    await expect(page.getByRole("link", { name: /Amber/ })).toBeVisible();
    await expect(page.getByText("Total CV").first()).toBeVisible();
    // Slot 1 is featured as a build card above the showcase.
    await expect(page.getByRole("heading", { name: "Featured" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Amber", level: 4 })).toBeVisible();

    // The display settings start off and are saved with the account.
    const pieceCv = page.getByRole("switch", { name: "CV on each piece" });
    await expect(pieceCv).toHaveAttribute("aria-checked", "false");
    await expect(page.getByRole("switch", { name: "Element colors" })).toHaveAttribute("aria-checked", "false");
    await pieceCv.click();
    await expect(pieceCv).toHaveAttribute("aria-checked", "true");
    await page.reload();
    await expect(page.getByRole("switch", { name: "CV on each piece" })).toHaveAttribute("aria-checked", "true");
    await page.getByRole("switch", { name: "CV on each piece" }).click();
    await expect(page.getByRole("switch", { name: "CV on each piece" })).toHaveAttribute("aria-checked", "false");

    // Each slot shows the build: main stats, CRIT from artifacts and what's missing.
    await expect(page.getByText(/^From artifacts: CRIT Rate/)).toBeVisible();
    await expect(page.getByRole("list", { name: "Still missing" })).toBeVisible();

    // Rename it, add a second showcase, fill it, move a slot, then delete it again.
    await page.getByRole("button", { name: "Rename this showcase" }).click();
    await page.getByRole("textbox", { name: "Showcase title" }).fill("Main team");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("tab", { name: "Main team" })).toHaveAttribute("aria-selected", "true");
    await page.getByRole("button", { name: "New showcase" }).click();
    await expect(page.getByRole("tab", { name: "Showcase 2" })).toHaveAttribute("aria-selected", "true");
    await page.getByRole("button", { name: "Fill empty slots" }).click();
    await page.getByRole("menuitem", { name: "By highest level, then talents" }).click();
    await expect(page.getByRole("status")).toContainText(/^Filled \d+ empty slots? by highest level/);
    const moveRight = page.getByRole("button", { name: /^Move .+ right$/ }).first();
    const moved = (await moveRight.getAttribute("aria-label"))!.slice("Move ".length, -" right".length);
    await moveRight.click();
    await expect(page.getByRole("status")).toHaveText(`${moved} moved to slot 2.`);
    await expect(page.getByRole("button", { name: `Move ${moved} right` })).toBeFocused();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.getByRole("tab", { name: "Main team" })).toBeFocused();
    await expect(page.getByRole("tab")).toHaveCount(1);

    // Someone in another slot is greyed out and can't be picked twice.
    await page.getByRole("button", { name: "Choose character for slot 2" }).click();
    await page.keyboard.type("amb");
    await expect(page.getByRole("group", { name: "Characters" }).getByRole("button", { name: /Amber/ })).toBeDisabled();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Change character for slot 1" }).click();
    await page.getByRole("button", { name: "Clear slot", exact: true }).click();
    await expect(page.getByRole("button", { name: "Choose characters" })).toBeFocused();
  });

  test("a character's page opens their build card", async () => {
    await page.goto("/genshin/characters/Furina");
    await page.getByRole("button", { name: "Build card" }).click();
    const dialog = page.getByRole("dialog", { name: "Furina's build" });
    await expect(dialog.getByText("Total CV")).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "From artifacts" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Save as image" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Build card" })).toBeFocused();
  });

  test("the profile shows the account and links back to the hub", async () => {
    await page.goto("/profile");
    await expect(page.getByText("Last upload")).toBeVisible();
    await page.getByRole("link", { name: "Back to your games" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
