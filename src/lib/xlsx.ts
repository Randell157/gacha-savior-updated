/**
 * Reads the cells of an .xlsx file, for paimon.moe's wish history export.
 * An .xlsx is a zip of XML files; this unzips with the browser's (and Node's)
 * built-in DecompressionStream, so no library is needed. It reads text and
 * numbers only: no formulas, dates or styles, and no zip64 (files over 4 GB).
 */

export type Sheets = Record<string, string[][]>;

const u16 = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8);
const u32 = (b: Uint8Array, i: number) => (u16(b, i) | (u16(b, i + 2) << 16)) >>> 0;

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** The files in a zip, by path. */
async function unzip(bytes: Uint8Array): Promise<Map<string, string>> {
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (u32(bytes, i) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new Error("not a zip file");
  const count = u16(bytes, end + 10);
  let at = u32(bytes, end + 16);
  const decoder = new TextDecoder();
  const files = new Map<string, string>();
  for (let n = 0; n < count; n++) {
    if (u32(bytes, at) !== 0x02014b50) throw new Error("broken zip directory");
    const method = u16(bytes, at + 10);
    const size = u32(bytes, at + 20);
    const nameLength = u16(bytes, at + 28);
    const skip = nameLength + u16(bytes, at + 30) + u16(bytes, at + 32);
    const local = u32(bytes, at + 42);
    const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength));
    at += 46 + skip;
    if (!name.endsWith(".xml") && !name.endsWith(".rels")) continue;
    if (size === 0xffffffff || local === 0xffffffff) throw new Error("zip64 isn't supported");
    const start = local + 30 + u16(bytes, local + 26) + u16(bytes, local + 28);
    const raw = bytes.subarray(start, start + size);
    if (method === 0) files.set(name, decoder.decode(raw));
    else if (method === 8) files.set(name, decoder.decode(await inflate(raw)));
  }
  return files;
}

const unescape = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");
const texts = (xml: string) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((t) => unescape(t[1])).join("");
const column = (ref: string) => [...ref.replace(/\d+/g, "")].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;

/** Every sheet's rows, by sheet name. Missing cells are empty strings. */
export async function readXlsx(bytes: Uint8Array): Promise<Sheets> {
  const files = await unzip(bytes);
  const workbook = files.get("xl/workbook.xml");
  const rels = files.get("xl/_rels/workbook.xml.rels");
  if (!workbook || !rels) throw new Error("not an Excel workbook");
  const shared = [...(files.get("xl/sharedStrings.xml") ?? "").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => texts(m[1]));
  const targets = new Map(
    [...rels.matchAll(/<Relationship\s[^>]*>/g)].map((m) => [
      m[0].match(/Id="([^"]+)"/)?.[1],
      m[0].match(/Target="([^"]+)"/)?.[1]?.replace(/^\/?(xl\/)?/, "xl/"),
    ])
  );

  const sheets: Sheets = {};
  for (const m of workbook.matchAll(/<sheet\s[^>]*>/g)) {
    const name = unescape(m[0].match(/name="([^"]*)"/)?.[1] ?? "");
    const xml = files.get(targets.get(m[0].match(/r:id="([^"]+)"/)?.[1]) ?? "");
    if (!xml) continue;
    sheets[name] = [...xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map((row) => {
      const cells: string[] = [];
      for (const c of row[1].matchAll(/<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = c[1];
        const inner = c[2] ?? "";
        const ref = attrs.match(/r="([A-Z]+\d+)"/)?.[1];
        const index = ref ? column(ref) : cells.length;
        const type = attrs.match(/t="(\w+)"/)?.[1];
        const v = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1];
        cells[index] = type === "s" ? shared[Number(v)] ?? "" : type === "inlineStr" ? texts(inner) : unescape(v ?? "");
      }
      return Array.from(cells, (x) => x ?? "");
    });
  }
  return sheets;
}
