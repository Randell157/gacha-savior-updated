"use client";

import { useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { Download } from "lucide-react";
import ArtifactSetBonuses from "@/components/ArtifactSetBonuses";
import ArtifactSlotCard from "@/components/ArtifactSlotCard";
import { ELEMENT_CHIP } from "@/components/CharacterGameInfo";
import WeaponIcon from "@/components/WeaponIcon";
import { Button } from "@/components/ui/button";
import { getCharacterDetails } from "@/lib/genshin/characterDetails";
import { SLOT_ORDER, artifactTotals, totalCritValue } from "@/lib/genshin/showcaseBuild";
import { formatSlotName, formatStatName, isPercentStat } from "@/lib/genshin/stats";
import type { GoodArtifact, GoodCharacter, GoodWeapon } from "@/lib/genshin/types";
import { getWeaponPassive, getWeaponStats } from "@/lib/genshin/weaponDetails";
import { weaponHref, weaponName } from "@/lib/genshin/weapons";
import { getCharacterPortrait, getCharacterRarity, rarityBackground } from "@/lib/genshinCharacters";
import { cn, formatCharacterDisplayName } from "@/lib/utils";

/** The strip along the card's top edge, in the character's element. */
const ELEMENT_BAND: Record<string, string> = {
  Anemo: "bg-teal-500",
  Geo: "bg-amber-500",
  Electro: "bg-purple-500",
  Dendro: "bg-lime-500",
  Hydro: "bg-sky-500",
  Pyro: "bg-red-500",
  Cryo: "bg-cyan-500",
};

const TALENTS = [
  { key: "auto", label: "Normal Attack" },
  { key: "skill", label: "Skill" },
  { key: "burst", label: "Burst" },
] as const;

interface BuildCardProps {
  character: GoodCharacter & { weapon?: GoodWeapon; artifacts?: GoodArtifact[] };
  /** The small label above the card, such as "Featured · slot 1 of Main team" */
  label: string;
  travelerElement?: string | null;
  /** The home page sample: no links, since its characters have no pages */
  preview?: boolean;
  /** The name's heading level, so headings don't skip: 3 under the overview's h2, 3 in a dialog too */
  headingLevel?: 3 | 4;
}

/**
 * The saved picture's width in CSS pixels (2,400 px at pixelRatio 2): wide
 * enough that the artifact cards' "5★ · Lv. 20" stays on one line.
 */
const SAVE_WIDTH = 1200;

/**
 * A whole build on one card (option C from `.mockups/build-card.html`): the
 * character, then the weapon, set bonuses and the stats the pieces add up to,
 * then all five pieces. It's the overview's "Featured" card and the character
 * page's "Build card" dialog, and it can be saved as a PNG. On screen it has
 * three columns from the `xl` breakpoint and is stacked below it. The saved
 * picture always has the three columns: Save renders a hidden copy with the
 * wide layout fixed, `SAVE_WIDTH` wide, captures that, and removes it.
 */
export default function BuildCard(props: BuildCardProps) {
  const wideRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const name = formatCharacterDisplayName(props.character.key);

  const save = async () => {
    setStatus("");
    // Render the hidden wide copy now, so it's in the page before capturing.
    flushSync(() => setSaving(true));
    try {
      const node = wideRef.current;
      if (!node) throw new Error("The wide copy didn't render.");
      // It's off-screen, so lazy images wouldn't load on their own.
      await Promise.all(
        Array.from(node.querySelectorAll("img")).map((img) => {
          img.loading = "eager";
          return img.decode().catch(() => undefined);
        })
      );
      const { toPng } = await import("html-to-image");
      const url = await toPng(node, {
        pixelRatio: 2,
        backgroundColor: getComputedStyle(node).backgroundColor,
        // Every Next.js image is /_next/image?url=…, so without the query they'd all share one cached picture.
        includeQueryParams: true,
        // Without the browser's usual Accept header, Next.js sends the transparent WebP icons as JPEGs on black.
        fetchRequestInit: { headers: { Accept: "image/avif,image/webp,image/png,image/*,*/*;q=0.8" } },
      });
      const link = document.createElement("a");
      link.download = `${name.replace(/[^\w-]+/g, "-")}-build.png`;
      link.href = url;
      link.click();
      setStatus(`Saved ${link.download}.`);
    } catch (error) {
      console.error("Saving the build card failed:", error);
      setStatus("The image couldn't be made. Try again, or take a screenshot instead.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <CardFace {...props} onSave={save} saving={saving} />
      {saving &&
        createPortal(
          <div
            aria-hidden="true"
            inert
            style={{ position: "fixed", top: 0, left: -10 * SAVE_WIDTH, width: SAVE_WIDTH, pointerEvents: "none" }}
          >
            <CardFace {...props} wide cardRef={wideRef} />
          </div>,
          document.body
        )}
      {status && (
        <p className="mt-2 text-xs text-gray-500 dark:text-slate-400" role="status">
          {status}
        </p>
      )}
    </div>
  );
}

/**
 * The card itself. `wide` fixes the three-column layout whatever the screen
 * size (the saved picture); otherwise it follows the breakpoints. The Save
 * button shows only when `onSave` is given.
 */
function CardFace({
  character: char,
  label,
  travelerElement,
  preview = false,
  headingLevel = 3,
  wide = false,
  cardRef,
  onSave,
  saving = false,
}: BuildCardProps & {
  wide?: boolean;
  cardRef?: React.Ref<HTMLDivElement>;
  onSave?: () => void;
  saving?: boolean;
}) {
  const NameHeading = `h${headingLevel}` as "h3" | "h4";
  const SectionHeading = `h${headingLevel + 1}` as "h4" | "h5";
  const name = formatCharacterDisplayName(char.key);
  const details = getCharacterDetails(char.key);
  const element = details?.element ?? travelerElement ?? null;
  const rarity = getCharacterRarity(char.key);
  const pieces = char.artifacts ?? [];
  const totals = artifactTotals(pieces);
  const weapon = char.weapon;
  const talent = char.talent;
  const weaponStats = weapon ? getWeaponStats(weapon.key, weapon.level, weapon.ascension ?? 0) : null;
  const passive = weapon ? getWeaponPassive(weapon.key, weapon.refinement) : null;

  return (
      <div
        ref={cardRef}
        className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900"
      >
        <div className={cn("h-1.5", (element && ELEMENT_BAND[element]) || "bg-indigo-500")} aria-hidden="true" />
        <div className={cn("flex flex-wrap items-start justify-between gap-3 pt-4", wide ? "px-5" : "px-4 sm:px-5")}>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">{label}</p>
          <div className="flex items-start gap-3">
            {onSave && (
              <Button type="button" variant="outline" size="sm" onClick={onSave} disabled={saving}>
                <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
                {saving ? "Saving…" : "Save as image"}
              </Button>
            )}
            <p className="text-right">
              <span className="block text-3xl font-bold leading-none tabular-nums text-indigo-900 dark:text-indigo-200">
                {totalCritValue(pieces)}
              </span>
              <span className="text-xs text-gray-500 dark:text-slate-400">Total CV</span>
            </p>
          </div>
        </div>

        <div
          className={cn(
            "grid gap-6",
            wide ? "grid-cols-[230px_270px_minmax(0,1fr)] p-5" : "p-4 sm:p-5 xl:grid-cols-[230px_270px_minmax(0,1fr)]"
          )}
        >
          {/* The character */}
          <div className={wide ? "block" : "flex flex-wrap gap-4 xl:block"}>
            <div
              className={cn(
                "relative flex-none overflow-hidden rounded-xl",
                wide ? "h-40 w-40" : "h-32 w-32 xl:h-40 xl:w-40",
                rarityBackground(rarity)
              )}
            >
              <Image src={getCharacterPortrait(char.key)} alt="" fill sizes="160px" className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <NameHeading
                className={cn(
                  "text-2xl font-bold leading-tight text-gray-900 dark:text-slate-100",
                  wide ? "mt-3" : "xl:mt-3"
                )}
              >
                {preview ? (
                  name
                ) : (
                  <Link href={`/genshin/characters/${encodeURIComponent(char.key)}`} className="hover:underline">
                    {name}
                  </Link>
                )}
              </NameHeading>
              {details?.title && (
                <p className="mt-0.5 text-sm italic text-gray-500 dark:text-slate-400">{details.title}</p>
              )}
              <p className="mt-2 flex flex-wrap gap-1 text-xs font-semibold">
                {element && (
                  <span className={cn("rounded-full px-2 py-0.5", ELEMENT_CHIP[element])}>{element}</span>
                )}
                {details?.weaponType && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700 dark:bg-slate-800 dark:text-slate-300">
                    {details.weaponType}
                  </span>
                )}
                {rarity && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700 dark:bg-slate-800 dark:text-slate-300">
                    {rarity}★
                  </span>
                )}
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-600 dark:text-slate-400">
                Lv. {char.level} ·
                <span className="inline-flex gap-[3px]" aria-hidden="true">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <span
                      key={n}
                      className={cn(
                        "h-2 w-2 rounded-full border",
                        n <= char.constellation
                          ? "border-indigo-600 bg-indigo-600 dark:border-indigo-400 dark:bg-indigo-400"
                          : "border-gray-500 dark:border-slate-400"
                      )}
                    />
                  ))}
                </span>
                C{char.constellation}
              </p>
              {talent && (
                <dl className="mt-3 space-y-1.5">
                  {TALENTS.map(({ key, label: talentLabel }) => (
                    <div
                      key={key}
                      className="flex items-baseline justify-between gap-2 border-t border-gray-200 pt-1.5 dark:border-slate-700"
                    >
                      <dt className="min-w-0 text-xs text-gray-600 dark:text-slate-400">
                        {talentLabel}
                        {details?.talents?.[key] && (
                          <span className="block truncate text-[11px] text-gray-500 dark:text-slate-400">
                            {details.talents[key]}
                          </span>
                        )}
                      </dt>
                      <dd className="text-lg font-bold tabular-nums text-gray-900 dark:text-slate-100">
                        {talent[key]}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </div>

          {/* The weapon, set bonuses and what the pieces add up to */}
          <div className="min-w-0 space-y-5 text-xs">
            <section>
              <SectionHeading className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Weapon</SectionHeading>
              {weapon ? (
                <>
                  <div className="flex items-center gap-3">
                    <WeaponIcon weaponKey={weapon.key} size="md" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                        {preview ? (
                          weaponName(weapon.key)
                        ) : (
                          <Link href={weaponHref(weapon.key)} className="hover:underline">
                            {weaponName(weapon.key)}
                          </Link>
                        )}
                      </p>
                      <p className="text-gray-500 dark:text-slate-400">
                        Lv {weapon.level} · R{weapon.refinement}
                        {weaponStats && ` · Base ATK ${weaponStats.baseAtk}`}
                        {weaponStats?.substat && ` · ${weaponStats.substat.name} ${weaponStats.substat.value}`}
                      </p>
                    </div>
                  </div>
                  {passive && (
                    <p className="mt-2 leading-relaxed text-gray-600 dark:text-slate-400">
                      <span className="font-semibold text-gray-900 dark:text-slate-100">{passive.name}.</span>{" "}
                      {passive.parts.map((part, i) =>
                        part.value ? (
                          <span key={i} className="font-semibold text-indigo-700 dark:text-indigo-300">
                            {part.text}
                          </span>
                        ) : (
                          <span key={i}>{part.text}</span>
                        )
                      )}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-gray-500 dark:text-slate-400">No weapon</p>
              )}
            </section>

            <section>
              <SectionHeading className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                Set bonuses
              </SectionHeading>
              {pieces.length > 0 ? (
                <ArtifactSetBonuses pieces={pieces} className="text-xs" />
              ) : (
                <p className="text-gray-500 dark:text-slate-400">No artifacts</p>
              )}
            </section>

            {totals.stats.length > 0 && (
              <section>
                <SectionHeading className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  From artifacts
                </SectionHeading>
                <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5">
                  {totals.stats.map(({ key, value }) => {
                    const crit = key === "critRate_" || key === "critDMG_";
                    const shown = isPercentStat(key) ? `${value}%` : `${Math.round(value)}`;
                    return (
                      <div key={key} className="contents">
                        <dt className={crit ? "font-semibold text-gray-900 dark:text-slate-100" : "text-gray-600 dark:text-slate-400"}>
                          {formatStatName(key)}
                        </dt>
                        <dd className={cn("text-right tabular-nums", crit ? "font-semibold text-gray-900 dark:text-slate-100" : "text-gray-900 dark:text-slate-100")}>
                          {shown}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
                <p className="mt-1.5 text-[11px] leading-snug text-gray-500 dark:text-slate-400">
                  The five pieces only: main stats at +20 and substats. Not the in-game total, which adds the
                  character, weapon and buffs.
                  {totals.partial && " A main stat below 5★ +20 isn't counted."}
                </p>
              </section>
            )}
          </div>

          {/* The pieces */}
          <section className="min-w-0">
            <SectionHeading className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Artifacts</SectionHeading>
            <div
              className={cn(
                "grid gap-2.5",
                wide ? "grid-cols-3" : "grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3"
              )}
            >
              {SLOT_ORDER.map((slot) => {
                const piece = pieces.find((p) => p.slotKey === slot);
                return piece ? (
                  <ArtifactSlotCard key={slot} artifact={piece} showMainValue />
                ) : (
                  <div
                    key={slot}
                    className="flex min-h-28 items-center justify-center rounded-lg border border-dashed border-gray-300 text-xs text-gray-500 dark:border-slate-600 dark:text-slate-400"
                  >
                    No {formatSlotName(slot).split(" ")[0].toLowerCase()}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <p
          className={cn(
            "flex flex-wrap justify-between gap-2 pb-3 text-[11px] text-gray-500 dark:text-slate-400",
            wide ? "px-5" : "px-4 sm:px-5"
          )}
        >
          <span>Gacha Savior</span>
          <span>Game artwork © HoYoverse</span>
        </p>
      </div>
  );
}
