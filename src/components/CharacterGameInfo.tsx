"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getCharacterDetails,
  getCharacterReactions,
  getCharacterRoles,
  isElementOnly,
  isTraveler,
  REACTION_ELEMENTS,
  TRAVELER_ELEMENTS,
  type CharacterReaction,
} from "@/lib/genshin/characterDetails";
import { getCharacterRarity } from "@/lib/genshinCharacters";
import { cn } from "@/lib/utils";

/** Chip colours for each element, in the same light/dark pairs as the rest of the site. */
const ELEMENT_CHIP: Record<string, string> = {
  Anemo: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200",
  Geo: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  Electro: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
  Dendro: "bg-lime-100 text-lime-800 dark:bg-lime-900/40 dark:text-lime-200",
  Hydro: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  Pyro: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  Cryo: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200",
};
/** The dot for each element on a reaction chip. */
const ELEMENT_DOT: Record<string, string> = {
  Anemo: "bg-teal-500",
  Geo: "bg-amber-500",
  Electro: "bg-purple-500",
  Dendro: "bg-lime-500",
  Hydro: "bg-sky-500",
  Pyro: "bg-red-500",
  Cryo: "bg-cyan-500",
};
const GREY_PILL = "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300";

function Pill({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", className)}>{children}</span>
  );
}

/** Stars for a rarity, read out as "5-star". */
export function Stars({ rarity }: { rarity: number }) {
  return (
    <>
      <span aria-hidden="true">{"★".repeat(rarity)}</span>
      <span className="sr-only">{rarity}-star</span>
    </>
  );
}

/**
 * What's true of a character for every player: title, element / weapon type /
 * rarity / region chips, playstyle, reactions, then the lore and small facts.
 * The Traveler's element chip is a dropdown, since the export doesn't say which element.
 */
export default function CharacterGameInfo({
  characterKey,
  travelerElement,
  onTravelerElement,
}: {
  characterKey: string;
  travelerElement: string | null;
  onTravelerElement: (element: string) => void;
}) {
  const details = getCharacterDetails(characterKey);
  const rarity = getCharacterRarity(characterKey);
  const roles = getCharacterRoles(characterKey);
  const facts = [
    details?.affiliation,
    details?.version && `Version ${details.version}`,
    details?.birthday && `Born ${details.birthday}`,
    details?.constellation && `Constellation: ${details.constellation}`,
  ].filter(Boolean);
  return (
    <>
      {details?.title && (
        <p className="text-sm font-medium text-gray-500 dark:text-slate-400">{details.title}</p>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        {isTraveler(characterKey) && (
          <Select value={travelerElement ?? undefined} onValueChange={onTravelerElement}>
            <SelectTrigger
              aria-label="Your Traveler's element"
              className={cn(
                "h-auto w-auto gap-1 rounded-full border-0 px-2.5 py-0.5 text-xs font-semibold",
                (travelerElement && ELEMENT_CHIP[travelerElement]) ||
                  "bg-indigo-100 text-indigo-800 data-[placeholder]:text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200 dark:data-[placeholder]:text-indigo-200"
              )}
            >
              <SelectValue placeholder="Choose your element" />
            </SelectTrigger>
            <SelectContent>
              {TRAVELER_ELEMENTS.map((element) => (
                <SelectItem key={element} value={element}>
                  {element}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {details?.element && (
          <Pill className={ELEMENT_CHIP[details.element] ?? GREY_PILL}>{details.element}</Pill>
        )}
        {details?.weaponType && <Pill className={GREY_PILL}>{details.weaponType}</Pill>}
        {rarity && (
          <Pill
            className={
              rarity === 5
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                : "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200"
            }
          >
            <Stars rarity={rarity} />
          </Pill>
        )}
        {details?.region && <Pill className={GREY_PILL}>{details.region}</Pill>}
      </div>
      {roles.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
            Playstyle
          </span>
          {roles.map((role) => (
            <Pill
              key={role}
              className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200"
            >
              {role}
            </Pill>
          ))}
        </div>
      )}
      {details?.element && isElementOnly(characterKey) ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
            Reactions
          </span>
          <Pill className={ELEMENT_CHIP[details.element] ?? GREY_PILL}>{details.element} only</Pill>
        </div>
      ) : (
        <ReactionsRow
          key={`${characterKey}-${travelerElement}`}
          reactions={getCharacterReactions(characterKey, travelerElement)}
        />
      )}
      {(details?.description || facts.length > 0) && (
        <div className="max-w-2xl">
          {details?.description && (
            <p className="text-sm italic text-gray-500 dark:text-slate-400">{details.description}</p>
          )}
          {facts.length > 0 && (
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{facts.join(" · ")}</p>
          )}
        </div>
      )}
    </>
  );
}

/** A chip per reaction, with its elements as dots. The main reaction's note shows until another chip is pressed. */
function ReactionsRow({ reactions }: { reactions: CharacterReaction[] }) {
  const [selected, setSelected] = useState(0);
  if (reactions.length === 0) return null;
  const current = reactions[selected];
  const currentElements = REACTION_ELEMENTS[current.reaction] ?? [];
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
          Reactions
        </span>
        {reactions.map(({ reaction }, index) => {
          const elements = REACTION_ELEMENTS[reaction] ?? [];
          return (
            <button
              key={reaction}
              type="button"
              aria-pressed={index === selected}
              onClick={() => setSelected(index)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border border-current px-2.5 py-0.5 text-xs font-semibold hover:ring-1 hover:ring-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                ELEMENT_CHIP[elements[0]] ?? GREY_PILL,
                // Outlined until chosen, so these read as controls beside the filled label chips above.
                index !== selected && "!bg-transparent"
              )}
            >
              {elements.map((element) => (
                <span
                  key={element}
                  aria-hidden="true"
                  className={cn("h-2 w-2 rounded-full", ELEMENT_DOT[element])}
                />
              ))}
              {reaction}
            </button>
          );
        })}
      </div>
      <p aria-live="polite" className="max-w-2xl text-sm text-gray-600 dark:text-slate-400">
        <span className="font-semibold text-gray-800 dark:text-slate-200">
          {current.reaction}
          {currentElements.length > 0 && ` (${currentElements.join(" + ")})`}:
        </span>{" "}
        {current.note}
      </p>
    </div>
  );
}
