"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ChevronDown, Pencil, Plus, UserPlus } from "lucide-react";
import ShowcasePicker from "@/components/ShowcasePicker";
import ShowcaseSlot from "@/components/ShowcaseSlot";
import ToggleSwitch from "@/components/ToggleSwitch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { buildEquipmentIndex } from "@/lib/genshin/equipment";
import {
  MAX_SHOWCASES,
  SHOWCASE_SIZE,
  SHOWCASE_TITLE_MAX,
  emptyShowcase,
  type NamedShowcase,
  type ShowcaseOptions,
} from "@/lib/genshin/firestoreStore";
import { fillOrder, fillSlots, moveSlot, swapSlots, type BuildSnapshot } from "@/lib/genshin/showcaseBuild";
import type { GenshinData } from "@/lib/genshin/types";
import { cn, formatCharacterDisplayName } from "@/lib/utils";

// The card reads the large weapon data, so it loads only once there's something to feature.
const BuildCard = dynamic(() => import("@/components/BuildCard"), {
  ssr: false,
  loading: () => <div className="h-96 animate-pulse rounded-xl bg-gray-100 motion-reduce:animate-none dark:bg-slate-800" />,
});

interface ShowcaseProps {
  data: GenshinData;
  showcases: NamedShowcase[];
  onShowcasesChange: (showcases: NamedShowcase[]) => void;
  options: ShowcaseOptions;
  onOptionsChange: (options: ShowcaseOptions) => void;
  travelerElement: string | null;
  previousBuilds: BuildSnapshot | null;
  /** The home page sample: no links, all five slots, and two at first on phones */
  preview: boolean;
}

const FILL_LABELS = { cv: "highest Total CV", level: "highest level, then talents" } as const;

/**
 * The Genshin overview's showcases (`.mockups/showcase-ideas.html`): tabs for
 * up to five, each with its own title and five slots; two display switches;
 * Fill empty slots; and slots that move with their arrows, or trade places when one is dragged onto another.
 */
export default function Showcase({
  data,
  showcases,
  onShowcasesChange,
  options,
  onOptionsChange,
  travelerElement,
  previousBuilds,
  preview,
}: ShowcaseProps) {
  const [active, setActive] = useState(0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  // On phones, the sample's slots stack, so most wait for a press.
  const [showAllSlots, setShowAllSlots] = useState(false);
  const section = useRef<HTMLDivElement>(null);
  // Buttons come and go as the showcase changes shape, so focus moves after the render.
  const focusNext = useRef<string | null>(null);
  useEffect(() => {
    if (!focusNext.current) return;
    section.current?.querySelector<HTMLElement>(focusNext.current)?.focus();
    focusNext.current = null;
  });

  const index = Math.min(active, showcases.length - 1);
  const current = showcases[index];
  // Slots holding a character that isn't in the latest upload show as empty.
  const picks = current.picks.map((key) => (key && data.characters.some((c) => c.key === key) ? key : null));
  const equipment = buildEquipmentIndex(data);
  const characterKeys = data.characters.map((c) => c.key);
  const filled = picks.flatMap((key, i) => (key ? [i] : []));
  const emptyCount = picks.length - filled.length;
  const firstEmpty = picks.findIndex((key) => !key);
  const nothingPicked = !preview && showcases.length === 1 && filled.length === 0;

  const update = (next: Partial<NamedShowcase>, at = index) =>
    onShowcasesChange(showcases.map((s, i) => (i === at ? { ...s, ...next } : s)));

  const setSlot = (slot: number, key: string | null) => {
    const next = [...picks];
    next[slot] = key;
    const isEmpty = next.every((k) => !k);
    if (showcases.length === 1 && (filled.length === 0) !== isEmpty) {
      focusNext.current = isEmpty ? "[data-showcase-start]" : `[aria-label="Change character for slot ${slot + 1}"]`;
    }
    update({ picks: next });
  };

  const moveTo = (from: number, to: number) => {
    if (from === to) return;
    update({ picks: moveSlot(picks, from, to) });
    const name = formatCharacterDisplayName(picks[from]!);
    setStatus(`${name} moved to slot ${to + 1}.`);
  };
  // Dropping one card on another trades their places.
  const swap = (from: number, to: number) => {
    if (from === to) return;
    update({ picks: swapSlots(picks, from, to) });
    const a = formatCharacterDisplayName(picks[from]!);
    const b = formatCharacterDisplayName(picks[to]!);
    setStatus(`${a} and ${b} swapped places.`);
  };
  const moveBy = (slot: number, direction: -1 | 1) => {
    const target = direction < 0 ? filled.filter((i) => i < slot).pop() : filled.find((i) => i > slot);
    if (target === undefined) return;
    const name = formatCharacterDisplayName(picks[slot]!);
    // Stay on the same arrow, or the other one once this end is reached.
    const atEnd = direction < 0 ? target === filled[0] : target === filled[filled.length - 1];
    const side = (direction < 0) !== atEnd ? "left" : "right";
    focusNext.current = `[aria-label="Move ${name} ${side}"]`;
    moveTo(slot, target);
  };

  const fill = (by: "cv" | "level") => {
    const next = fillSlots(picks, fillOrder(data, by));
    const added = next.filter((key, i) => key && !picks[i]).length;
    update({ picks: next });
    setStatus(
      added
        ? `Filled ${added} empty ${added === 1 ? "slot" : "slots"} by ${FILL_LABELS[by]}. Change or clear any of them.`
        : "Every character is already in this showcase."
    );
  };

  const selectTab = (i: number) => {
    setActive(i);
    setEditing(false);
    setConfirmDelete(false);
    setStatus("");
  };
  const addShowcase = () => {
    const title = `Showcase ${showcases.length + 1}`;
    onShowcasesChange([...showcases, { title, picks: emptyShowcase() }]);
    selectTab(showcases.length);
    focusNext.current = `#showcase-tab-${showcases.length}`;
  };
  const startRename = () => {
    setDraft(current.title);
    setConfirmDelete(false);
    setEditing(true);
    focusNext.current = "#showcase-title";
  };
  const saveTitle = () => {
    const title = draft.trim().slice(0, SHOWCASE_TITLE_MAX);
    if (title) update({ title });
    setEditing(false);
    focusNext.current = "[data-rename]";
  };
  const deleteShowcase = () => {
    onShowcasesChange(showcases.filter((_, i) => i !== index));
    selectTab(Math.max(0, index - 1));
    focusNext.current = `#showcase-tab-${Math.max(0, index - 1)}`;
  };

  const switches = (
    <div className="flex flex-wrap gap-x-5" role="group" aria-label="Showcase display">
      <ToggleSwitch checked={options.elementColors} onChange={(elementColors) => onOptionsChange({ ...options, elementColors })}>
        Element colors
      </ToggleSwitch>
      <ToggleSwitch checked={options.pieceCv} onChange={(pieceCv) => onOptionsChange({ ...options, pieceCv })}>
        CV on each piece
      </ToggleSwitch>
    </div>
  );

  if (nothingPicked) {
    return (
      <div ref={section}>
        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="text-lg">{current.title}</CardTitle>
              <CardDescription className="mt-1.5">Pick up to five characters to feature here.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <ShowcasePicker
                slot={0}
                value={null}
                characterKeys={characterKeys}
                showcaseKeys={picks}
                onChange={(key) => setSlot(0, key)}
                startLabel="Choose characters"
              />
              <FillMenu onFill={fill} />
            </div>
          </CardHeader>
          {status && (
            <p className="px-6 pb-4 text-xs text-gray-500 dark:text-slate-400" role="status">
              {status}
            </p>
          )}
        </Card>
      </div>
    );
  }

  const featured = picks[0] ? data.characters.find((c) => c.key === picks[0]) : undefined;

  return (
    <div ref={section}>
      {featured && (
        <section className="mb-6" aria-labelledby="featured-heading">
          <h3 id="featured-heading" className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            Featured
          </h3>
          <p className="mb-3 text-sm text-gray-500 dark:text-slate-400">
            Slot 1 of &ldquo;{current.title}&rdquo;. Move someone to slot 1 to feature them.
          </p>
          <BuildCard
            character={{ ...featured, ...equipment.get(featured.key) }}
            label={`Featured · slot 1 of ${current.title}`}
            travelerElement={travelerElement}
            preview={preview}
            headingLevel={4}
          />
        </section>
      )}
      <Card>
        <div
          className="flex flex-wrap gap-1 border-b border-gray-200 px-4 pt-2 dark:border-slate-700 sm:px-6"
          role="tablist"
          aria-label="Showcases"
          onKeyDown={(e) => {
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
            const next = (index + (e.key === "ArrowRight" ? 1 : -1) + showcases.length) % showcases.length;
            selectTab(next);
            focusNext.current = `#showcase-tab-${next}`;
          }}
        >
          {showcases.map((s, i) => (
            <button
              key={i}
              id={`showcase-tab-${i}`}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-controls="showcase-panel"
              tabIndex={i === index ? 0 : -1}
              onClick={() => selectTab(i)}
              className={cn(
                "-mb-px max-w-[12rem] truncate border-b-2 px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                i === index
                  ? "border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300"
                  : "border-transparent text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100"
              )}
            >
              {s.title}
            </button>
          ))}
          {showcases.length < MAX_SHOWCASES && (
            <button
              type="button"
              onClick={addShowcase}
              className="-mb-px inline-flex items-center gap-1 border-b-2 border-transparent px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:text-slate-100"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              New showcase
            </button>
          )}
        </div>
        <div id="showcase-panel" role="tabpanel" aria-labelledby={`showcase-tab-${index}`}>
          <CardHeader className="flex-row flex-wrap items-start justify-between gap-x-6 gap-y-2 space-y-0">
            <div className="min-w-0">
              {editing ? (
                <form
                  className="flex flex-wrap items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveTitle();
                  }}
                >
                  <Input
                    id="showcase-title"
                    value={draft}
                    maxLength={SHOWCASE_TITLE_MAX}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setEditing(false);
                        focusNext.current = "[data-rename]";
                      }
                    }}
                    aria-label="Showcase title"
                    className="h-9 w-56 text-base font-semibold"
                  />
                  <Button type="submit" size="sm">
                    Save
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </form>
              ) : (
                <div className="flex items-center gap-1">
                  <CardTitle className="truncate text-lg">{current.title}</CardTitle>
                  <button
                    type="button"
                    data-rename=""
                    onClick={startRename}
                    className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                    aria-label="Rename this showcase"
                    title="Rename"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  {showcases.length > 1 && !confirmDelete && (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="rounded-md px-1.5 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-red-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-red-300"
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
              {confirmDelete ? (
                <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                  Delete &ldquo;{current.title}&rdquo; and its picks?
                  <Button type="button" size="sm" variant="destructive" onClick={deleteShowcase}>
                    Delete
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                    Keep it
                  </Button>
                </p>
              ) : (
                <CardDescription className="mt-1.5">Keep up to 5 favorite characters here.</CardDescription>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {switches}
              {emptyCount > 0 && <FillMenu onFill={fill} />}
            </div>
          </CardHeader>
          <CardContent>
            {status && (
              <p className="-mt-2 mb-3 text-xs text-gray-500 dark:text-slate-400" role="status">
                {status}
              </p>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {Array.from({ length: SHOWCASE_SIZE }, (_, i) => {
                const key = picks[i];
                // The real showcase shows your picks and one place to add another.
                if (!preview && !key && i !== firstEmpty) return null;
                const hidden = preview && !showAllSlots && i >= 2;
                const picker = (
                  <ShowcasePicker
                    slot={i}
                    value={key}
                    characterKeys={characterKeys}
                    showcaseKeys={picks}
                    onChange={(k) => setSlot(i, k)}
                  />
                );
                const char = key ? data.characters.find((c) => c.key === key) : undefined;
                if (char) {
                  return (
                    <ShowcaseSlot
                      key={key}
                      index={i}
                      character={{ ...char, ...equipment.get(char.key) }}
                      options={options}
                      travelerElement={travelerElement}
                      previousBuilds={previousBuilds}
                      preview={preview}
                      hidden={hidden}
                      onClear={() => setSlot(i, null)}
                      move={{
                        canMoveLeft: filled[0] < i,
                        canMoveRight: filled[filled.length - 1] > i,
                        onMove: (direction) => moveBy(i, direction),
                        dragging: dragFrom === i,
                        dropTarget: dragOver === i && dragFrom !== i,
                        dragHandlers: {
                          onDragStart: (e) => {
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("text/plain", String(i));
                            setDragFrom(i);
                          },
                          onDragEnd: () => {
                            setDragFrom(null);
                            setDragOver(null);
                          },
                          onDragOver: (e) => {
                            if (dragFrom === null) return;
                            e.preventDefault();
                            if (dragOver !== i) setDragOver(i);
                          },
                          onDragLeave: () => setDragOver((over) => (over === i ? null : over)),
                          onDrop: (e) => {
                            e.preventDefault();
                            if (dragFrom !== null) swap(dragFrom, i);
                            setDragFrom(null);
                            setDragOver(null);
                          },
                        },
                      }}
                    >
                      {picker}
                    </ShowcaseSlot>
                  );
                }
                return (
                  <div
                    key={`empty-${i}`}
                    className={cn(
                      "relative flex min-h-[280px] flex-col rounded-xl border border-dashed border-gray-300 bg-gray-50/70 p-3 dark:border-slate-600 dark:bg-slate-800/40",
                      hidden && "hidden sm:flex"
                    )}
                  >
                    <div className="mb-3 flex min-h-6 items-center">
                      <span className="text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                        Slot {i + 1}
                      </span>
                    </div>
                    <div className="mb-3 flex flex-1 flex-col items-center justify-center py-4 text-center">
                      <div className="mb-2 flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white text-gray-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-500">
                        <UserPlus className="h-8 w-8" />
                      </div>
                      <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Empty slot</p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Choose a character below</p>
                    </div>
                    {picker}
                  </div>
                );
              })}
            </div>
            {preview && !showAllSlots && (
              <Button type="button" variant="outline" className="mt-3 w-full sm:hidden" onClick={() => setShowAllSlots(true)}>
                Show all {SHOWCASE_SIZE} slots
              </Button>
            )}
          </CardContent>
        </div>
      </Card>
    </div>
  );
}

/** "Fill empty slots": by Total CV, or by level and then talents. It only acts when pressed. */
function FillMenu({ onFill }: { onFill: (by: "cv" | "level") => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Fill empty slots
          <ChevronDown className="ml-1 h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onFill("cv")}>By highest Total CV</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onFill("level")}>By highest level, then talents</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
