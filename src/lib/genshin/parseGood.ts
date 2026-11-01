import type {
  GenshinData,
  GoodArtifact,
  GoodCharacter,
  GoodSubstat,
  GoodWeapon,
} from "./types";

export type ParseGoodResult =
  | { ok: true; data: GenshinData; warnings: string[] }
  | { ok: false; error: string };

/** GOOD versions the parser has been checked against */
const KNOWN_VERSIONS = [1, 2, 3];

type Raw = Record<string, unknown>;

const isObject = (v: unknown): v is Raw =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === "string" && v !== "";
const optNum = (v: unknown) => (isNum(v) ? v : undefined);
const optStr = (v: unknown) => (isStr(v) ? v : undefined);
const optBool = (v: unknown) => (typeof v === "boolean" ? v : undefined);

function parseCharacter(c: unknown): GoodCharacter | null {
  if (!isObject(c) || !isStr(c.key) || !isNum(c.level) || !isNum(c.constellation)) {
    return null;
  }
  const t = c.talent;
  return {
    key: c.key,
    level: c.level,
    constellation: c.constellation,
    ascension: optNum(c.ascension),
    talent:
      isObject(t) && isNum(t.auto) && isNum(t.skill) && isNum(t.burst)
        ? { auto: t.auto, skill: t.skill, burst: t.burst }
        : undefined,
  };
}

function parseWeapon(w: unknown): GoodWeapon | null {
  if (!isObject(w) || !isStr(w.key) || !isNum(w.level) || !isNum(w.refinement)) {
    return null;
  }
  return {
    key: w.key,
    level: w.level,
    refinement: w.refinement,
    ascension: optNum(w.ascension),
    location: optStr(w.location),
    lock: optBool(w.lock),
  };
}

function parseArtifact(a: unknown): GoodArtifact | null {
  if (
    !isObject(a) ||
    !isStr(a.setKey) ||
    !isStr(a.slotKey) ||
    !isNum(a.level) ||
    !isNum(a.rarity)
  ) {
    return null;
  }
  const substats: GoodSubstat[] = Array.isArray(a.substats)
    ? a.substats
        .filter((s): s is Raw => isObject(s) && isStr(s.key) && isNum(s.value))
        .map((s) => ({ key: s.key as string, value: s.value as number }))
    : [];
  return {
    setKey: a.setKey,
    slotKey: a.slotKey,
    level: a.level,
    rarity: a.rarity,
    mainStatKey: optStr(a.mainStatKey),
    location: optStr(a.location),
    lock: optBool(a.lock),
    substats,
  };
}

function parseList<T>(
  value: unknown,
  label: string,
  parseItem: (item: unknown) => T | null,
  warnings: string[]
): T[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    warnings.push(`Ignored "${label}" because it isn't a list.`);
    return [];
  }
  const items = value.map(parseItem).filter((x): x is T => x !== null);
  const skipped = value.length - items.length;
  if (skipped > 0) {
    warnings.push(`Skipped ${skipped} ${label} with missing or invalid fields.`);
  }
  return items;
}

/** Validates and normalizes a GOOD export. Bad entries are dropped with a warning. */
export function parseGood(json: unknown): ParseGoodResult {
  if (!isObject(json)) {
    return { ok: false, error: "The file isn't a Genshin data export." };
  }
  if (json.format !== "GOOD") {
    return {
      ok: false,
      error:
        'The file isn\'t in GOOD format. Export your data from Inventory Kamera or Irminsul and upload that file.',
    };
  }

  const warnings: string[] = [];
  const version = isNum(json.version) ? json.version : 0;
  if (!KNOWN_VERSIONS.includes(version)) {
    warnings.push(
      `GOOD version ${json.version ?? "unknown"} hasn't been tested; some data may be missing.`
    );
  }

  const characters = parseList(json.characters, "characters", parseCharacter, warnings);
  const weapons = parseList(json.weapons, "weapons", parseWeapon, warnings);
  const artifacts = parseList(json.artifacts, "artifacts", parseArtifact, warnings);

  const materials: Record<string, number> = {};
  if (isObject(json.materials)) {
    for (const [key, count] of Object.entries(json.materials)) {
      if (isNum(count)) materials[key] = count;
    }
  }

  if (
    !characters.length &&
    !weapons.length &&
    !artifacts.length &&
    !Object.keys(materials).length
  ) {
    return { ok: false, error: "No characters, weapons, artifacts or materials were found in the file." };
  }

  return {
    ok: true,
    data: {
      format: "GOOD",
      version,
      source: optStr(json.source),
      characters,
      weapons,
      artifacts,
      materials,
    },
    warnings,
  };
}

/** Parses the text of an uploaded .json file. */
export function parseGoodText(text: string): ParseGoodResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "The file isn't valid JSON." };
  }
  return parseGood(json);
}
