import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { createUser, logIn, uploadSample, WISH_FILE, wishInput } from "./helpers";

// The Wishes page (Phase 5). The made-up exports: wishes-older.json (1,253
// wishes) and wishes-newer.json (1,004, 476 of them also in the older one) for
// UID 800000001, and wishes-paimon.xlsx, the older wishes as a paimon.moe file.
// Merged, they make 1,781 wishes; on Character Event, 1,137 wishes, pity 6,
// 17 5★s averaging 66.5, and the next 5★ a 50/50.

const importDone = (page: Page) => page.getByRole("alert").filter({ hasText: "Import complete" });
const importFailed = (page: Page) => page.getByRole("alert").filter({ hasText: "Import failed" });

test("signed out, the page shows the made-up history with a log-in banner", async ({ page }) => {
  await page.goto("/genshin/wishes");
  await expect(page.getByText("This is a made-up wish history.")).toBeVisible();
  await expect(page.getByText("6 / 90")).toBeVisible();
  await expect(page.getByText("66.5")).toBeVisible();
  await expect(page.getByText("Next 5★: 50/50")).toBeVisible();

  // Pressing a chart month with a 5★ turns the history to it and highlights it.
  const chart = page.getByRole("region", { name: "Wishes per month" });
  await chart.getByRole("button", { name: "Feb 2024: 53 wishes, 5★: Jean. Show in the history" }).press("Enter");
  await expect(page.getByText("Page 2 of 2")).toBeVisible();
  await expect(page.locator("li[data-picked]")).toHaveCount(1);
  await expect(page.locator("li[data-picked]")).toContainText("Jean");
  await expect(page.getByText("Found in the 5★ history: Jean, Feb 14, 2024.")).toBeAttached();
  await chart.getByRole("button", { name: /^Jan 2026: .*Venti. Show in the history$/ }).click();
  await expect(page.getByText("Page 1 of 2")).toBeVisible();
  await expect(page.locator("li[data-picked]")).toContainText("Venti");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator("li[data-picked]")).toHaveCount(0);
});

test("a paimon.moe file and UIGF exports merge into one history", async ({ page }) => {
  await logIn(page, await createUser());
  await page.goto("/genshin/wishes");
  await expect(page.getByText("Import your wish history")).toBeVisible();

  await wishInput(page).setInputFiles(WISH_FILE("wishes-paimon.xlsx"));
  await expect(importDone(page)).toContainText("1,253 wishes added. 0 were already saved. You now have 1,253 wishes.");

  await wishInput(page).setInputFiles(WISH_FILE("wishes-newer.json"));
  await expect(importDone(page)).toContainText("528 wishes added. 476 were already saved. You now have 1,781 wishes.");

  await wishInput(page).setInputFiles(WISH_FILE("wishes-older.json"));
  await expect(importDone(page)).toContainText("No new wishes: all 1,253 wishes in this file were already saved.");

  // It's saved: a fresh load reads the same history back.
  await page.reload();
  await expect(page.getByText(/1,781 wishes since Jan 1, 2024 · UID 800000001/)).toBeVisible();
  await expect(page.getByText("6 / 90")).toBeVisible();
  await expect(page.getByText("(17, newest first)")).toBeVisible();
  await expect(page.getByRole("main").getByRole("listitem")).toHaveCount(10);
  await expect(page.getByText("Page 1 of 2")).toBeVisible();

  // Wishes per month follows the chosen banner and the range.
  const chart = page.getByRole("region", { name: "Wishes per month" });
  await expect(chart).toContainText("Last 2 years · 1,092 wishes on Character Event");
  await chart.getByRole("button", { name: "All" }).click();
  await expect(chart).toContainText("All time · 1,137 wishes on Character Event");
  await expect(chart.getByRole("button", { name: "Jan 2026: 22 wishes, 5★: Venti. Show in the history" })).toBeAttached();

  await page.getByRole("button", { name: "Weapon Event" }).click();
  await expect(page.getByText("15 / 80")).toBeVisible();
  await expect(page.getByText("Next 5★")).toHaveCount(0);
  await expect(chart).toContainText("290 wishes on Weapon Event");
});

test.describe("import errors", () => {
  test.beforeEach(async ({ page }) => {
    await logIn(page, await createUser());
    await page.goto("/genshin/wishes");
  });

  const cases = [
    { name: "a file of another type", file: "notes.txt", text: "hello", message: "Choose a paimon.moe Excel file (.xlsx) or a UIGF wish history file (.json)." },
    { name: "broken JSON", file: "wishes.json", text: '{"info": ', message: "This file couldn't be read. It may be incomplete. Export it again and import the new file." },
    { name: "a GOOD export", file: "export.json", text: '{"format": "GOOD", "version": 2}', message: "This file isn't a UIGF wish history export." },
    { name: "another game's wishes", file: "hsr.json", text: '{"info": {"version": "v4.0"}, "hkrpg": [{"uid": "1", "list": []}]}', message: "This export has no Genshin Impact wishes." },
    { name: "an Excel file that isn't one", file: "fake.xlsx", text: "not really excel", message: "This Excel file couldn't be read." },
  ];
  for (const { name, file, text, message } of cases) {
    test(name, async ({ page }) => {
      await wishInput(page).setInputFiles({ name: file, mimeType: "application/octet-stream", buffer: Buffer.from(text) });
      await expect(importFailed(page)).toContainText(message);
    });
  }
});

test("deleting the upload keeps the wish history, which Profile deletes on its own", async ({ page }) => {
  await logIn(page, await createUser());
  await uploadSample(page);
  await page.goto("/genshin/wishes");
  await wishInput(page).setInputFiles(WISH_FILE("wishes-newer.json"));
  await expect(importDone(page)).toBeVisible();

  await page.goto("/profile");
  const panel = page.getByRole("region", { name: "Delete data" });
  await panel.getByRole("button", { name: "Delete upload" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete upload" }).click();
  await expect(panel.getByRole("status")).toHaveText("Your upload was deleted.");
  await expect(panel.getByRole("button", { name: "Delete wish history" })).toBeVisible();

  await page.goto("/genshin/wishes");
  await expect(page.getByText(/1,004 wishes since/)).toBeVisible();

  await page.goto("/profile");
  await panel.getByRole("button", { name: "Delete wish history" }).click();
  await expect(page.getByRole("dialog")).toContainText("This removes all 1,004 saved wishes.");
  await page.getByRole("dialog").getByRole("button", { name: "Delete wish history" }).click();
  await expect(panel.getByRole("status")).toHaveText("Your wish history was deleted.");
  await expect(panel.getByRole("button", { name: "Delete wish history" })).toHaveCount(0);

  await page.goto("/genshin/wishes");
  await expect(page.getByText("Import your wish history")).toBeVisible();
});

test("a file with two accounts asks which, and another UID is refused", async ({ page }) => {
  await logIn(page, await createUser());
  await page.goto("/genshin/wishes");
  await wishInput(page).setInputFiles(WISH_FILE("wishes-newer.json"));
  await expect(importDone(page)).toBeVisible();

  const file = JSON.parse(readFileSync(WISH_FILE("wishes-newer.json"), "utf8"));
  const other = file.hk4e[0].list.slice(0, 212).map((p: { id: string }, i: number) => ({ ...p, id: String(BigInt("1900000000000000000") + BigInt(i)) }));
  file.hk4e.push({ uid: "600000003", timezone: 8, lang: "en-us", list: other });
  await wishInput(page).setInputFiles({ name: "two.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(file)) });

  const dialog = page.getByRole("dialog", { name: "Choose an account" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("radio", { name: /UID 800000001/ })).toBeChecked();
  await dialog.getByRole("radio", { name: /UID 600000003/ }).check();
  await dialog.getByRole("button", { name: "Import" }).click();
  await expect(importFailed(page)).toContainText("This file is for UID 600000003, but your saved wish history is for UID 800000001.");
});
