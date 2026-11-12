import { expect, test } from "@playwright/test";
import { createUser, logIn, uploadSample } from "./helpers";

test("a character's plan, saved to the Planner tab and added up there", async ({ page }) => {
  await logIn(page, await createUser());
  await uploadSample(page);

  // Chevreuse is Lv 80 with talents 1 / 8 / 1 in the sample.
  await page.goto("/genshin/characters/Chevreuse");
  const plan = page.getByRole("region", { name: "Plan" });
  await expect(plan.getByText("2 materials still short.")).toBeVisible();
  await plan.getByRole("button", { name: "Raise Skill target" }).click();
  for (let i = 0; i < 8; i++) await plan.getByRole("button", { name: "Raise Burst target" }).click();
  await expect(plan.getByText("4 materials still short.")).toBeVisible();
  const unihorn = plan.getByRole("row", { name: /Fontemer Unihorn/ });
  await expect(unihorn).toContainText("20");
  await expect(unihorn).toContainText("17");
  await expect(plan.getByRole("row", { name: /Mora/ })).toContainText("Not in your export");
  await expect(plan.getByText("Covered by your books")).toBeVisible();

  // Bars, remembered on the next page.
  await plan.getByRole("button", { name: "Bars" }).click();
  await expect(plan.getByText("3 / 20 · 17 missing")).toBeVisible();

  await plan.getByRole("button", { name: "Add to planner" }).click();
  await expect(plan.getByText("Added to the Planner tab.")).toBeVisible();
  await expect(plan.getByRole("link", { name: "In your planner" })).toBeVisible();

  await page.getByRole("link", { name: "Planner", exact: true }).click();
  await expect(page).toHaveURL(/\/genshin\/planner$/);
  await expect(page.getByText("Lv 80 → 90 · Talents 1 / 8 / 1 → 1 / 9 / 9")).toBeVisible();
  await expect(page.getByRole("button", { name: "Bars", pressed: true })).toBeVisible();

  // Add a weapon from the tab: Citlali's Thrilling Tales of Dragon Slayers, Lv 1.
  await page.getByRole("button", { name: "Add a weapon" }).click();
  await page.getByRole("textbox", { name: "Search weapons or holders" }).fill("thrilling citlali");
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Plan for Thrilling Tales of Dragon Slayers" });
  await dialog.getByRole("button", { name: "Add to planner" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add a weapon" })).toBeFocused();
  await expect(page.getByText("Lv 1 → 90 · held by Citlali")).toBeVisible();

  const total = page.getByRole("region", { name: "Everything still needed" });
  await expect(total.getByText("All 2 plans added up, against your last upload")).toBeVisible();
  await expect(total.getByText("Weapon EXP")).toBeVisible();
  await expect(total.getByText("3 / 20 · 17 missing")).toBeVisible();

  // Saved with the account.
  await page.reload();
  await expect(page.getByRole("button", { name: /^Remove/ })).toHaveCount(2);

  // Edit, then remove.
  await page.getByRole("button", { name: "Edit Chevreuse's plan" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Lower Burst target" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Talents 1 / 8 / 1 → 1 / 9 / 8")).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit Chevreuse's plan" })).toBeFocused();
  await page.getByRole("button", { name: "Remove Chevreuse from your planner" }).click();
  await expect(page.getByText("Removed Chevreuse from your planner.")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Remove/ })).toHaveCount(1);
});

test("a weapon page plans the copy you pick", async ({ page }) => {
  await logIn(page, await createUser());
  await uploadSample(page);
  await page.goto("/genshin/weapons/FavoniusSword");
  const plan = page.getByRole("region", { name: "Plan" });
  // Starts on a copy below its cap: the unequipped Lv 1.
  await expect(plan.getByRole("combobox", { name: "Copy" })).toContainText("Unequipped · Lv 1");
  await expect(plan.getByText("Weapon EXP")).toBeVisible();
  await plan.getByRole("combobox", { name: "Copy" }).click();
  await page.getByRole("option", { name: /Held by Kaedehara Kazuha/ }).click();
  await expect(plan.getByText("Nothing to gain: these targets are where you are now.")).toBeVisible();
});
