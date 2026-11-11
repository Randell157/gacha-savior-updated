import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readXlsx } from "./xlsx.ts";

const file = (name: string) => new Uint8Array(readFileSync(new URL(`../../public/sample-data/test-account/${name}`, import.meta.url)));

test("readXlsx reads every sheet's rows", async () => {
  const sheets = await readXlsx(file("wishes-paimon.xlsx"));
  assert.deepEqual(Object.keys(sheets), ["Character Event", "Weapon Event", "Standard", "Chronicled Wish", "Beginners' Wish", "Information"]);
  assert.deepEqual(sheets["Character Event"][0], ["Type", "Name", "Time", "⭐", "Pity", "#Roll", "Group", "Banner", "Part"]);
  assert.equal(sheets.Information[0][0], "Paimon.moe Wish History Export");
  // An apostrophe in a sheet name and in cells comes back unescaped.
  assert.equal(sheets["Beginners' Wish"][1].length, 9);
});

test("readXlsx rejects files that aren't workbooks", async () => {
  await assert.rejects(readXlsx(new TextEncoder().encode("not a zip at all, just text")), /not a zip/);
  await assert.rejects(readXlsx(file("wishes-older.json")), /not a zip/);
});
