import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseGood, parseGoodText } from "./parseGood.ts";

const character = { key: "Furina", level: 90, constellation: 2, ascension: 6, talent: { auto: 1, skill: 9, burst: 10 } };
const weapon = { key: "SplendorOfTranquilWaters", level: 90, refinement: 1, ascension: 6, location: "Furina", lock: true };
const artifact = {
  setKey: "GoldenTroupe",
  slotKey: "flower",
  level: 20,
  rarity: 5,
  mainStatKey: "hp",
  location: "Furina",
  lock: true,
  substats: [
    { key: "critRate_", value: 7.8 },
    { key: "critDMG_", value: 14 },
  ],
};

const good = (extra: Record<string, unknown> = {}) => ({
  format: "GOOD",
  version: 2,
  source: "Irminsul",
  characters: [character],
  weapons: [weapon],
  artifacts: [artifact],
  materials: { MoraIntro: 5 },
  ...extra,
});

function parseOk(json: unknown) {
  const result = parseGood(json);
  assert.ok(result.ok, result.ok ? "" : result.error);
  return result;
}

test("reads a valid export with no warnings", () => {
  const { data, warnings } = parseOk(good());
  assert.deepEqual(warnings, []);
  assert.equal(data.format, "GOOD");
  assert.equal(data.version, 2);
  assert.equal(data.source, "Irminsul");
  assert.deepEqual(data.characters, [character]);
  assert.deepEqual(data.weapons, [weapon]);
  assert.deepEqual(data.artifacts, [artifact]);
  assert.deepEqual(data.materials, { MoraIntro: 5 });
});

test("rejects anything that isn't a GOOD object", () => {
  for (const json of [null, [], "GOOD", 3, { format: "OTHER" }, { characters: [character] }]) {
    const result = parseGood(json);
    assert.equal(result.ok, false, JSON.stringify(json));
  }
});

test("rejects an export with nothing in it", () => {
  const result = parseGood({ format: "GOOD", version: 2 });
  assert.equal(result.ok, false);
  assert.match(result.ok ? "" : result.error, /No characters, weapons, artifacts or materials/);
});

test("accepts an export that has only materials", () => {
  const { data } = parseOk({ format: "GOOD", version: 2, materials: { MoraIntro: 1 } });
  assert.deepEqual(data.characters, []);
  assert.deepEqual(data.materials, { MoraIntro: 1 });
});

test("warns about an untested or missing version", () => {
  assert.match(parseOk(good({ version: 99 })).warnings[0], /GOOD version 99 hasn't been tested/);
  const missing = parseOk(good({ version: undefined }));
  assert.equal(missing.data.version, 0);
  assert.match(missing.warnings[0], /GOOD version unknown/);
});

test("skips entries with missing fields and counts them", () => {
  const { data, warnings } = parseOk(
    good({
      characters: [character, { key: "Nahida", level: 90 }, null],
      weapons: [weapon, { key: "", level: 1, refinement: 1 }],
      artifacts: [artifact, { ...artifact, rarity: "5" }],
    })
  );
  assert.equal(data.characters.length, 1);
  assert.equal(data.weapons.length, 1);
  assert.equal(data.artifacts.length, 1);
  assert.deepEqual(warnings, [
    "Skipped 2 characters with missing or invalid fields.",
    "Skipped 1 weapons with missing or invalid fields.",
    "Skipped 1 artifacts with missing or invalid fields.",
  ]);
});

test("ignores a section that isn't a list", () => {
  const { data, warnings } = parseOk(good({ weapons: { key: "Nope" } }));
  assert.deepEqual(data.weapons, []);
  assert.deepEqual(warnings, ['Ignored "weapons" because it isn\'t a list.']);
});

test("drops optional fields of the wrong type instead of the whole entry", () => {
  const { data } = parseOk(
    good({
      characters: [{ ...character, ascension: "6", talent: { auto: 1, skill: 9 } }],
      weapons: [{ ...weapon, location: "", lock: "yes" }],
    })
  );
  assert.equal(data.characters[0].ascension, undefined);
  assert.equal(data.characters[0].talent, undefined);
  assert.equal(data.weapons[0].location, undefined);
  assert.equal(data.weapons[0].lock, undefined);
});

test("keeps only well-formed substats and numeric materials", () => {
  const { data } = parseOk(
    good({
      artifacts: [{ ...artifact, substats: [{ key: "atk", value: 19 }, { key: "def" }, "hp", { key: "", value: 5 }] }],
      materials: { MoraIntro: 5, Broken: "7", Inf: Infinity },
    })
  );
  assert.deepEqual(data.artifacts[0].substats, [{ key: "atk", value: 19 }]);
  assert.deepEqual(data.materials, { MoraIntro: 5 });
});

test("an artifact without a substat list gets an empty one", () => {
  const { substats: _, ...noSubstats } = artifact;
  const { data } = parseOk(good({ artifacts: [noSubstats] }));
  assert.deepEqual(data.artifacts[0].substats, []);
});

test("parseGoodText reports broken JSON", () => {
  const result = parseGoodText('{"format": "GOOD", ');
  assert.equal(result.ok, false);
  assert.match(result.ok ? "" : result.error, /couldn't be read/);
});

test("reads the sample exports in public/sample-data", () => {
  const files = [
    ["inventory-kamera/genshin_export_2026-02-11_12-16.json", 1717],
    ["inventory-kamera/genshinData_GOOD_2024_10_28_01_22.json", null],
    ["test-account/all-characters.json", null],
  ] as const;
  for (const [file, artifactCount] of files) {
    const text = readFileSync(new URL(`../../../public/sample-data/${file}`, import.meta.url), "utf8");
    const result = parseGoodText(text);
    assert.ok(result.ok, `${file}: ${result.ok ? "" : result.error}`);
    assert.deepEqual(result.warnings, [], file);
    assert.ok(result.data.characters.length > 0, file);
    if (artifactCount !== null) assert.equal(result.data.artifacts.length, artifactCount, file);
  }
});
