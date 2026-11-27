"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { createPortal, flushSync } from "react-dom";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import Segmented from "@/components/Segmented";
import { itemIcon, wishDate } from "@/components/WishStats";
import { rarityBackground } from "@/lib/genshinCharacters";
import { POOLS, type Pull, type WishPool } from "@/lib/genshin/wishes";
import type { YearInReview } from "@/lib/genshin/yearInReview";
import { cn } from "@/lib/utils";

// The year in review's card (Phase 7 step 6; picks 1A, 2A and 4A from
// .mockups/year-review.html, with the image in either shape): the year's
// numbers, luckiest pull, longest dry streak, every 5★, wishes per month, luck
// against the odds. On screen it follows the page's
// width; Save renders a hidden copy at the chosen shape's fixed size and saves
// it at 2×, as the build card does.

export type CardShape = "vertical" | "square" | "tablet" | "horizontal";

/** Each shape's name, ratio and size in CSS pixels when saved; the PNG is twice that. */
export const SHAPES: { shape: CardShape; label: string; ratio: string; width: number; height: number }[] = [
  { shape: "vertical", label: "Vertical", ratio: "9:16", width: 540, height: 960 },
  { shape: "square", label: "Square", ratio: "1:1", width: 720, height: 720 },
  { shape: "tablet", label: "Tablet", ratio: "4:3", width: 800, height: 600 },
  { shape: "horizontal", label: "Horizontal", ratio: "16:9", width: 960, height: 540 },
];
const shapeInfo = (shape: CardShape) => SHAPES.find((s) => s.shape === shape)!;

/** The shape that suits the screen: vertical on phones, 4:3 on tablets, horizontal on desktops. */
function screenShape(): CardShape {
  const width = window.innerWidth;
  return width < 640 ? "vertical" : width < 1024 ? "tablet" : "horizontal";
}
const subscribeResize = (onChange: () => void) => {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
};

/** Past this many 5★s, the strip shows one fewer and "+N more". */
const STRIP_MAX = 18;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const n = (value: number) => value.toLocaleString("en-US");
const plural = (count: number, one: string, many: string) => `${n(count)} ${count === 1 ? one : many}`;
const poolLabel = (pool: WishPool) => POOLS.find((p) => p.pool === pool)?.label ?? pool;
/** "Mar 5", the year being the card's own. */
const shortDate = (time: string) => wishDate(time).replace(/, \d{4}$/, "");

/** "Your 13 5★s ... luckier than about 92% of players." Null without a 5★ on the 90-wish banners. */
export function luckWords(review: YearInReview): string | null {
  const luck = review.luck;
  if (!luck) return null;
  const pct = Math.min(99, Math.max(1, Math.round(luck.luckierThan * 100)));
  const lead =
    luck.fiveStars === 1
      ? `Your one 5★ on the 90-wish banners took ${luck.averagePity} wishes.`
      : `Your ${n(luck.fiveStars)} 5★s on the 90-wish banners came at ${luck.averagePity} wishes on average.`;
  return `${lead} The expected average is about ${luck.expectedAverage}, so you were luckier than about ${pct}% of players.`;
}

function Picture({ pull, size, className }: { pull: Pull | null; size: string; className?: string }) {
  const src = pull ? itemIcon(pull) : null;
  return (
    <span className={cn("block shrink-0 overflow-hidden", pull ? rarityBackground(pull.rarity) : "bg-gray-200 dark:bg-slate-700", size, className)}>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      )}
    </span>
  );
}

function Stat({ value, label, detail, big }: { value: string; label: string; detail?: string; big?: boolean }) {
  return (
    <div className="flex flex-col justify-center rounded-lg bg-indigo-50 px-3 py-2 dark:bg-slate-800">
      <p className={cn("font-bold leading-tight text-indigo-950 dark:text-white", big ? "text-3xl" : "text-xl")}>{value}</p>
      <p className="text-xs font-medium text-gray-700 dark:text-slate-300">{label}</p>
      {detail && <p className="text-xs text-gray-600 dark:text-slate-300">{detail}</p>}
    </div>
  );
}

interface CardProps {
  review: YearInReview;
  shape: CardShape;
  /** True for the year still under way: the title says "so far". */
  soFar: boolean;
}

/** The card itself. `fixed` gives it the saved size; otherwise it fits the page. */
function CardFace({ review: r, shape, soFar, fixed, cardRef }: CardProps & { fixed?: boolean; cardRef?: React.Ref<HTMLDivElement> }) {
  const size = shapeInfo(shape);
  // The two-column pictures (4:3 and 16:9) stretch the number tiles; every picture stretches the chart.
  const grow = !!fixed && (shape === "tablet" || shape === "horizontal");
  const max = Math.max(1, ...r.months.map((m) => m.wishes));
  const strip = r.fiveStars.length > STRIP_MAX ? r.fiveStars.slice(0, STRIP_MAX - 1) : r.fiveStars;
  const more = r.fiveStars.length - strip.length;
  const ff = r.fiftyFifty;
  const L = r.luckiest;
  const D = r.longestDryStreak;
  const luck = luckWords(r);

  const head = (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Gacha Savior · Genshin Impact</p>
      <p className="text-2xl font-bold text-indigo-950 dark:text-white">
        {r.year}: year in review{soFar && <span className="text-base font-semibold text-gray-500 dark:text-slate-400"> (so far)</span>}
      </p>
    </div>
  );

  const numbers = (
    // In the two-column pictures the tiles grow to fill the left column.
    <div className={cn("grid gap-2", fixed && shape === "square" ? "grid-cols-4" : "grid-cols-2", grow && "flex-1 auto-rows-fr")}>
      <Stat big={grow} value={n(r.wishes)} label="Wishes" detail={`≈ ${n(r.primogems)} Primogems`} />
      <Stat big={grow} value={n(r.fiveStars.length)} label="5★s" detail={`${n(r.fourStars)} 4★`} />
      <Stat
        big={grow}
        value={ff.winRate === null ? "—" : `${ff.won}–${ff.lost}`}
        label="50/50s won–lost"
        detail={ff.guaranteed ? `${n(ff.guaranteed)} guaranteed` : undefined}
      />
      <Stat
        big={grow}
        value={r.busiestMonth ? FULL_MONTHS[Number(r.busiestMonth.month.slice(5)) - 1] : "—"}
        label="Busiest month"
        detail={r.busiestMonth ? plural(r.busiestMonth.wishes, "wish", "wishes") : undefined}
      />
    </div>
  );

  const T = r.bestTenPull;
  const highlights = (L || D || T) && (
    <div className="grid gap-2">
      {L && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2 dark:border-emerald-900 dark:bg-emerald-950/40">
          <Picture pull={L.pull} size="h-11 w-11" className="rounded-lg" />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">Luckiest pull</p>
            <p className="truncate font-semibold text-gray-900 dark:text-slate-100">{L.pull.name}</p>
            <p className="text-xs text-gray-600 dark:text-slate-300">
              {L.pity === 1 ? "First wish" : `${n(L.pity)} wishes`} · {poolLabel(L.pool)} · {shortDate(L.pull.time)}
            </p>
          </div>
        </div>
      )}
      {D && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-2 dark:border-amber-900 dark:bg-amber-950/40">
          <Picture pull={D.endedBy ?? null} size="h-11 w-11" className="rounded-lg" />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">Longest dry streak</p>
            <p className="truncate font-semibold text-gray-900 dark:text-slate-100">{plural(D.wishes, "wish", "wishes")} without a 5★</p>
            <p className="text-xs text-gray-600 dark:text-slate-300">
              {poolLabel(D.pool)} ·{" "}
              {D.endedBy ? `then ${D.endedBy.name}, ${shortDate(D.endedBy.time)}` : soFar ? "still going" : "still going at the end of the year"}
            </p>
          </div>
        </div>
      )}
      {T && (
        <div className="rounded-lg border border-violet-200 bg-violet-50 p-2 dark:border-violet-900 dark:bg-violet-950/40">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-800 dark:text-violet-300">Best ten-pull</p>
            <p className="text-xs text-gray-600 dark:text-slate-300">
              {[T.fiveStars && `${T.fiveStars}× 5★`, T.fourStars && `${T.fourStars}× 4★`].filter(Boolean).join(" and ")} ·{" "}
              {poolLabel(T.pool)} · {shortDate(T.time)}
            </p>
          </div>
          <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label={`Best ten-pull: ${T.pulls.map((p) => p.name).join(", ")}`}>
            {T.pulls.map((p) => (
              <li key={p.id}>
                <Picture pull={p} size="h-9 w-9" className="rounded-md" />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const fiveStars = r.fiveStars.length > 0 && (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-gray-700 dark:text-slate-300">Every 5★ in {r.year}</p>
      <ul className="flex flex-wrap gap-1.5" aria-label={`Every 5★ in ${r.year}, with the wishes each took`}>
        {strip.map((f) => (
          <li key={f.pull.id} className="relative">
            <Picture pull={f.pull} size="h-10 w-10" className="rounded-md" />
            <span className="sr-only">
              {f.pull.name}, {plural(f.pity, "wish", "wishes")}
            </span>
            <span
              aria-hidden="true"
              className="absolute -bottom-1 -right-1 rounded bg-white px-1 text-[10px] font-bold leading-4 text-gray-900 shadow dark:bg-slate-900 dark:text-white"
            >
              {f.pity}
            </span>
          </li>
        ))}
        {more > 0 && (
          <li className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-200 text-xs font-semibold text-gray-800 dark:bg-slate-700 dark:text-slate-100">
            +{more}
            <span className="sr-only"> more</span>
          </li>
        )}
      </ul>
    </div>
  );

  // The chart takes the height left over in the saved picture, and in the 4:3 and 16:9
  // cards on screen too, where it fills the right column down to the left one's bottom.
  const chartGrows = !!fixed || shape === "tablet" || shape === "horizontal";
  const perMonth = (
    <div className={cn("flex flex-col", chartGrows && "min-h-28 flex-1")}>
      <p className="mb-1 text-xs font-semibold text-gray-700 dark:text-slate-300">Wishes per month</p>
      <div className={cn("flex items-stretch gap-1", chartGrows ? "min-h-16 flex-1" : "h-16")} aria-hidden="true">
        {r.months.map((m, i) => (
          <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full flex-1 items-end">
              <div
                className={cn(
                  "w-full rounded-t",
                  r.busiestMonth?.month === m.month ? "bg-indigo-600 dark:bg-indigo-400" : "bg-indigo-200 dark:bg-indigo-900"
                )}
                style={{ height: `${Math.max(4, (m.wishes / max) * 100)}%` }}
              />
            </div>
            <span className="text-[10px] leading-none text-gray-600 dark:text-slate-300">{MONTHS[i][0]}</span>
          </div>
        ))}
      </div>
      <p className="sr-only">{r.months.map((m, i) => `${MONTHS[i]} ${n(m.wishes)}`).join(", ")}</p>
    </div>
  );

  // One row of portraits in the saved picture (as many as fit its width), all of them on screen.
  const newLimit = fixed ? { vertical: 12, square: 8, tablet: 8, horizontal: 10 }[shape] : Infinity;
  // 5★s first, then 4★s, each in the order pulled.
  const newSorted = [...r.newCharacters].sort((a, b) => b.pull.rarity - a.pull.rarity);
  const newShown = newSorted.length > newLimit ? newSorted.slice(0, newLimit - 1) : newSorted;
  const newMore = r.newCharacters.length - newShown.length;
  const newCharacters = (r.newCharacters.length > 0 || r.constellations > 0) && (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-gray-700 dark:text-slate-300">
        {plural(r.newCharacters.length, "character", "characters")} new to your wish history
        {r.constellations > 0 && ` · ${plural(r.constellations, "constellation", "constellations")}`}
      </p>
      {newShown.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={`Characters new to your wish history in ${r.year}`}>
          {newShown.map(({ pull }) => (
            <li key={pull.id}>
              <Picture pull={pull} size="h-8 w-8" className="rounded-md" />
              <span className="sr-only">{pull.name}</span>
            </li>
          ))}
          {newMore > 0 && (
            <li className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-200 text-xs font-semibold text-gray-800 dark:bg-slate-700 dark:text-slate-100">
              +{newMore}
              <span className="sr-only"> more</span>
            </li>
          )}
        </ul>
      )}
    </div>
  );

  const luckBox = (
    <div className="rounded-lg border border-indigo-200 bg-white p-3 text-sm text-gray-900 dark:border-indigo-900 dark:bg-slate-900 dark:text-slate-100">
      <p>
        {luck ??
          "No 5★s on the Character Event, Standard or Chronicled Wish banners this year, so there's nothing to compare with the odds."}
      </p>
      {luck && (
        <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
          An estimate from the game&apos;s published odds and a community-measured soft pity, not other players&apos; data.
        </p>
      )}
    </div>
  );

  return (
    <div
      ref={cardRef}
      data-year-card={shape}
      className={cn(
        "overflow-hidden rounded-xl border bg-gradient-to-b from-indigo-50 to-white p-4 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:to-slate-950",
        !fixed && { vertical: "max-w-[540px]", square: "max-w-[720px]", tablet: "max-w-[800px]", horizontal: "max-w-[960px]" }[shape]
      )}
      style={fixed ? { width: size.width, height: size.height } : undefined}
    >
      {shape === "vertical" ? (
        <div className={cn("flex flex-col gap-3", fixed && "h-full")}>
          {head}
          {numbers}
          {highlights}
          {fiveStars}
          {newCharacters}
          {perMonth}
          {luckBox}
        </div>
      ) : shape === "square" ? (
        <div className={cn("flex flex-col gap-3", fixed && "h-full")}>
          {head}
          {numbers}
          <div className={cn("grid gap-3", fixed ? "grid-cols-2" : "md:grid-cols-2")}>
            {highlights}
            {luckBox}
          </div>
          <div className={cn("grid gap-3", fixed ? "grid-cols-2" : "md:grid-cols-2")}>
            {fiveStars}
            {newCharacters}
          </div>
          {perMonth}
        </div>
      ) : (
        <div className={cn("grid gap-4", fixed ? "h-full grid-cols-2" : "md:grid-cols-2")}>
          <div className="flex flex-col gap-3">
            {head}
            {numbers}
            {highlights}
          </div>
          <div className="flex flex-col gap-3">
            {fiveStars}
          {newCharacters}
            {luckBox}
            {perMonth}
          </div>
        </div>
      )}
    </div>
  );
}

/** The card with its shape switch and Save as image. */
export default function YearInReviewCard(props: Omit<CardProps, "shape">) {
  // Until a shape is picked, the one that suits the screen (horizontal before the page knows it).
  const [picked, setPicked] = useState<CardShape | null>(null);
  const fromScreen = useSyncExternalStore(subscribeResize, screenShape, () => "horizontal" as CardShape);
  const shape = picked ?? fromScreen;
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const fixedRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);

  const save = async () => {
    setStatus("");
    // Render the hidden fixed-size copy now, so it's in the page before capturing.
    flushSync(() => setSaving(true));
    try {
      const node = fixedRef.current;
      if (!node) throw new Error("The card copy didn't render.");
      await Promise.all(
        Array.from(node.querySelectorAll("img")).map((img) => {
          img.loading = "eager";
          return img.decode().catch(() => undefined);
        })
      );
      const { toPng } = await import("html-to-image");
      const url = await toPng(node, {
        pixelRatio: 2,
        // The corners outside the rounded card: the colour the card sits on.
        backgroundColor: backgroundBehind(screenRef.current),
        fetchRequestInit: { headers: { Accept: "image/avif,image/webp,image/png,image/*,*/*;q=0.8" } },
      });
      const link = document.createElement("a");
      link.download = `gacha-savior-${props.review.year}-in-review-${shapeInfo(shape).ratio.replace(":", "x")}.png`;
      link.href = url;
      link.click();
      setStatus(`Saved ${link.download}.`);
    } catch (error) {
      console.error("Saving the year in review failed:", error);
      setStatus("The image couldn't be made. Try again, or take a screenshot instead.");
    } finally {
      setSaving(false);
    }
  };

  const size = shapeInfo(shape);
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Off while saving, so the picture and its file name keep the shape that was chosen. */}
        <fieldset disabled={saving} className="contents">
          <Segmented
            label="Image shape"
            value={shape}
            onChange={setPicked}
            options={SHAPES.map((s) => ({
              value: s.shape,
              label: (
                <>
                  {s.label}
                  <span className="hidden text-xs opacity-80 sm:inline"> {s.ratio}</span>
                </>
              ),
            }))}
          />
        </fieldset>
        <Button size="sm" onClick={save} disabled={saving}>
          <Download className="mr-1.5 h-4 w-4" />
          {saving ? "Saving..." : "Save as image"}
        </Button>
        <span className="text-xs text-gray-500 dark:text-slate-400">
          {n(size.width * 2)} × {n(size.height * 2)} px
        </span>
      </div>
      <div ref={screenRef}>
        <CardFace {...props} shape={shape} />
      </div>
      {saving &&
        createPortal(
          <div
            aria-hidden="true"
            inert
            style={{ position: "fixed", top: 0, left: -4 * size.width, width: size.width, pointerEvents: "none" }}
          >
            <CardFace {...props} shape={shape} fixed cardRef={fixedRef} />
          </div>,
          document.body
        )}
      {/* Always in the page, so screen readers announce the text when it arrives. */}
      <p className="mt-2 text-xs text-gray-500 empty:hidden dark:text-slate-400" role="status">
        {status}
      </p>
    </div>
  );
}

/** The first solid background colour behind an element, for the saved picture's corners. */
function backgroundBehind(node: HTMLElement | null): string {
  for (let el = node?.parentElement; el; el = el.parentElement) {
    const color = getComputedStyle(el).backgroundColor;
    if (color && color !== "transparent" && !/rgba\(.*,\s*0\)$/.test(color)) return color;
  }
  return document.documentElement.classList.contains("dark") ? "#020817" : "#ffffff";
}
