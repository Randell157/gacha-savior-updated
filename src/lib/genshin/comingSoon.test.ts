import { test } from "node:test";
import assert from "node:assert/strict";
import { COMING_SOON, upcomingCharacters, type ComingSoonCharacter } from "./comingSoon.ts";

const soon = (name: string, version: string): ComingSoonCharacter => ({
  name,
  iconFile: `${name}_Icon.png`,
  version,
});

test("announced characters not on the roster are grouped by version", () => {
  const groups = upcomingCharacters(
    [soon("Anastasya", "7.3"), soon("Danica", "7.3"), soon("Someone", "7.4")],
    ["Furina", "Mitya"]
  );
  assert.deepEqual(
    groups.map((g) => [g.version, g.characters.map((c) => c.name)]),
    [
      ["7.3", ["Anastasya", "Danica"]],
      ["7.4", ["Someone"]],
    ]
  );
});

test("a character already on the roster leaves the list, matched loosely", () => {
  const groups = upcomingCharacters([soon("Anastasya", "7.3"), soon("Danica", "7.3")], ["anastasya"]);
  assert.deepEqual(groups.map((g) => g.characters.map((c) => c.name)), [["Danica"]]);
  assert.deepEqual(upcomingCharacters([soon("Kaedehara Kazuha", "1.6")], ["KaedeharaKazuha"]), []);
});

test("nothing is left once every one is released", () => {
  assert.deepEqual(upcomingCharacters(COMING_SOON, COMING_SOON.map((c) => c.name)), []);
});
