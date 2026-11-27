import { expect, test } from "@playwright/test";
import { createUser, logIn, uploadSample } from "./helpers";

// Quick search (Ctrl+K), and the pages it opens for things you don't have.

test("signed out, quick search opens a character's page with the game's information", async ({ page }) => {
  await page.goto("/features");
  const button = page.getByRole("button", { name: "Search (Ctrl+K)" });
  const dialog = page.getByRole("dialog", { name: "Search" });

  // The header button opens it with the box focused; Escape puts focus back on the button.
  await button.click();
  await expect(dialog.getByRole("combobox")).toBeFocused();
  await expect(dialog.getByText("Type a character, weapon, artifact set or material.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(button).toBeFocused();

  // Ctrl+K, keyboard only: grouped results, the first one picked, Enter opens it.
  await page.keyboard.press("Control+k");
  await page.keyboard.type("fur");
  await expect(dialog.getByRole("group", { name: "Characters" }).getByRole("option", { name: /Furina/ })).toBeVisible();
  await expect(dialog.getByRole("group", { name: "Artifact sets" }).getByRole("option", { name: /Heart of the Furnace/ })).toBeVisible();
  await expect(dialog.getByRole("option", { selected: true })).toContainText("Furina");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/genshin\/characters\/Furina$/);
  await expect(page.getByRole("heading", { level: 1, name: "Furina" })).toBeVisible();
  await expect(page.getByText("Log in to see your own build and plan for Furina here.")).toBeVisible();
  await expect(page.getByText("Endless Solo of Solitude")).toBeVisible();

  // A weapon's page, signed out, with its passive.
  await page.keyboard.press("Control+k");
  await page.keyboard.type("amos");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: "Amos' Bow" })).toBeVisible();
  await expect(page.getByText("Log in to see your own copies and plan for Amos' Bow here.")).toBeVisible();
  await expect(page.getByText("Strong-Willed", { exact: false }).first()).toBeVisible();

  // The last ones opened come back with nothing typed; nothing found says so.
  await page.keyboard.press("Control+k");
  await expect(dialog.getByRole("group", { name: "Recently opened" }).getByRole("option")).toHaveCount(2);
  // Clearing it, by keyboard, opens nothing and puts focus back in the box.
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Clear recent history" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/genshin\/weapons\/amosbow$/);
  await expect(dialog.getByText("Type a character, weapon, artifact set or material.")).toBeVisible();
  await expect(dialog.getByRole("combobox")).toBeFocused();
  await page.keyboard.type("zzq");
  await expect(dialog.getByText("No results for “zzq”.")).toBeVisible();
});

test("signed in, results show what you have, sets open Artifacts and materials open a panel", async ({ page }) => {
  await logIn(page, await createUser());
  await uploadSample(page);
  const dialog = page.getByRole("dialog", { name: "Search" });

  await page.keyboard.press("Control+k");
  // Wait for the box: right after the upload, typing could start before the dialog takes focus.
  await expect(dialog.getByRole("combobox")).toBeFocused();
  await page.keyboard.type("favonius lance");
  await expect(dialog.getByRole("option", { name: /Favonius Lance/ })).toContainText(/copies|R\d · Lv \d+/);

  // A set: Artifacts on All, filtered to it.
  await page.getByRole("combobox").fill("emblem severed");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/genshin\/artifacts$/);
  await expect(page.locator("#artifact-set")).toContainText("Emblem of Severed Fate");

  // A material: a panel with where it drops, and back to the results.
  await page.keyboard.press("Control+k");
  await page.keyboard.type("philosophies freedom");
  await page.keyboard.press("Enter");
  await expect(dialog.getByText("Forsaken Rift · Mon/Thu + Sun")).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Open the planner" })).toBeVisible();
  await dialog.getByRole("button", { name: "Back to results" }).click();
  await expect(dialog.getByRole("combobox")).toHaveValue("philosophies freedom");
});
