import { expect, test } from "@playwright/test";
import { createUser, logIn, OLDER_EXPORT, SAMPLE_EXPORT, uploadSample, uploadText } from "./helpers";

test("an upload is saved to the account and shown on the overview and hub", async ({ page }) => {
  await logIn(page, await createUser());
  await uploadSample(page);

  const counts = page.getByRole("main");
  for (const [title, count] of [
    ["Characters", "91"],
    ["Weapons", "336"],
    ["Artifacts", "1,717"],
  ]) {
    await expect(counts.getByRole("link", { name: new RegExp(`${title}.*${count}`, "s") })).toBeVisible();
  }

  // It's stored in Firestore, not just in the page.
  await page.reload();
  await expect(page.getByRole("link", { name: "Characters 91" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Weapons 336" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Artifacts 1,717" })).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByText("1,717")).toBeVisible();
});

test("a new upload keeps the Traveler's element", async ({ page }) => {
  await logIn(page, await createUser());
  await uploadSample(page);

  await page.goto("/genshin/characters/Traveler");
  const element = page.getByRole("combobox", { name: "Your Traveler's element" });
  await element.click();
  await page.getByRole("option", { name: "Hydro" }).click();
  await expect(element).toHaveText("Hydro");

  // Move within the site, so the upload starts from the state already in the page.
  await page.getByRole("link", { name: "Overview" }).click();
  await expect(page).toHaveURL(/\/genshin$/);
  await page.getByLabel("Upload a GOOD export (.json)").setInputFiles(SAMPLE_EXPORT);
  await expect(page.getByRole("alert").filter({ hasText: "Saved" })).toBeVisible();

  // Both the page's copy and the saved one.
  await page.getByRole("link", { name: "Characters", exact: true }).click();
  await page.goto("/genshin/characters/Traveler");
  await expect(element).toHaveText("Hydro");
  await expect(page.getByText("Vaporize (Pyro + Hydro):")).toBeVisible();
});

test("a second upload lists what changed, once", async ({ page }) => {
  await logIn(page, await createUser());
  await page.goto("/genshin");
  await page.getByLabel("Upload a GOOD export (.json)").setInputFiles(OLDER_EXPORT);
  await expect(page.getByRole("alert").filter({ hasText: "Saved" })).toBeVisible();
  // A first upload has nothing to compare.
  await expect(page.getByRole("heading", { name: "Since your last upload" })).toHaveCount(0);

  await page.getByLabel("Upload a GOOD export (.json)").setInputFiles(SAMPLE_EXPORT);
  const changes = page.getByRole("region", { name: "Since your last upload" });
  await expect(changes).toBeVisible();
  for (const [count, label] of [
    ["18", "new characters"],
    ["58", "characters changed"],
    ["110", "new weapons"],
    ["1,312", "new artifacts"],
  ]) {
    await expect(changes.getByRole("definition").filter({ hasText: new RegExp(`^${count}$`) })).toBeVisible();
    await expect(changes.getByText(label, { exact: true })).toBeVisible();
  }
  await expect(changes.getByText("Level 1 → 80")).toBeVisible(); // Chevreuse
  await changes.getByRole("button", { name: "Show all 58" }).click();
  await expect(changes.getByRole("button", { name: "Show fewer" })).toBeVisible();
  await changes.getByRole("button", { name: "Close what changed" }).click();
  await expect(changes).toHaveCount(0);
  await expect(page.locator("#main")).toBeFocused();

  // The same file again changes nothing.
  await page.getByLabel("Upload a GOOD export (.json)").setInputFiles(SAMPLE_EXPORT);
  await expect(page.getByRole("alert").filter({ hasText: "Saved" })).toContainText(
    "Nothing changed since your last upload"
  );
  await expect(changes).toHaveCount(0);
});

test.describe("upload errors", () => {
  test.beforeEach(async ({ page }) => {
    await logIn(page, await createUser());
    await page.goto("/genshin");
  });

  const cases = [
    {
      name: "a file that isn't an export",
      text: "[1, 2, 3]",
      message: "This file isn't a GOOD export. Export again from Inventory Kamera or Irminsul and choose the GOOD format.",
    },
    {
      name: "broken JSON",
      text: '{"format": "GOOD", ',
      message: "This file couldn't be read. It may be incomplete. Export it again and upload the new file.",
    },
    {
      name: "an export in another format",
      text: '{"format": "SomethingElse"}',
      message: "The file isn't in GOOD format. Export your data from Inventory Kamera or Irminsul and upload that file.",
    },
  ];
  for (const { name, text, message } of cases) {
    test(name, async ({ page }) => {
      await uploadText(page, text);
      const alert = page.getByRole("alert").filter({ hasText: "Upload failed" });
      await expect(alert).toContainText(message);
    });
  }
});
