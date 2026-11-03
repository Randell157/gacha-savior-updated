import { expect, test } from "@playwright/test";
import { createUser, logIn, uploadSample, uploadText } from "./helpers";

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
  await expect(page.getByText("91 characters, 336 weapons and 1,717 artifacts")).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByText("1,717")).toBeVisible();
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
