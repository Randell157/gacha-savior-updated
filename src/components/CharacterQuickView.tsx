"use client";

import { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useCharacterExtras } from "@/hooks/useCharacterExtras";
import { BaseStats, ChooseElementHint, ConstellationPicker, TalentButtons } from "@/components/CharacterExtras";
import CharacterGameInfo from "@/components/CharacterGameInfo";
import SignedOutBanner from "@/components/SignedOutBanner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { isTraveler } from "@/lib/genshin/characterDetails";
import { getCharacterPortrait, getCharacterRarity, rarityBackground } from "@/lib/genshinCharacters";
import { cn, formatCharacterDisplayName } from "@/lib/utils";

/**
 * The dialog from a tile for a character the visitor doesn't own (signed out,
 * that's all of them): the character's game info, and a log-in prompt if signed out.
 */
export default function CharacterQuickView({
  characterKey,
  onClose,
  onCloseAutoFocus,
}: {
  characterKey: string | null;
  onClose: () => void;
  /** The dialog has no trigger of its own, so the page says where focus goes back to. */
  onCloseAutoFocus: (event: Event) => void;
}) {
  const name = characterKey ? formatCharacterDisplayName(characterKey) : "";
  return (
    <Dialog open={characterKey !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        aria-describedby={undefined}
        onCloseAutoFocus={onCloseAutoFocus}
        className="max-h-[90vh] max-w-2xl overflow-y-auto"
      >
        <DialogTitle className="text-xl font-bold text-indigo-900 dark:text-indigo-200">{name}</DialogTitle>
        {/* Keyed so the open talent and constellation don't carry over to the next character. */}
        {characterKey && <QuickViewBody key={characterKey} characterKey={characterKey} name={name} />}
      </DialogContent>
    </Dialog>
  );
}

/**
 * A character's game info with nothing from an upload: the quick view's body,
 * and the character page for a character you don't have (or signed out), which
 * shows its own note or banner above it instead of the footer (`footer={false}`).
 */
export function QuickViewBody({
  characterKey,
  name,
  footer = true,
  stats = true,
}: {
  characterKey: string;
  name: string;
  footer?: boolean;
  /** The base stats at level 90; the character page leaves them out (design "A" from `.mockups/unowned-pages.html`) */
  stats?: boolean;
}) {
  const { user } = useAuth();
  // Not saved: only a Traveler in an upload has a saved element.
  const [travelerElement, setTravelerElement] = useState<string | null>(null);
  // With no build to show, stats are shown at level 90, fully ascended.
  const extras = useCharacterExtras(characterKey, travelerElement, 90, 6);
  return (
    <>
      <div className="flex flex-col gap-5 sm:flex-row">
        <div
          className={cn(
            "relative h-28 w-28 shrink-0 overflow-hidden rounded-xl ring-1 ring-indigo-100 dark:ring-indigo-900",
            rarityBackground(getCharacterRarity(characterKey))
          )}
        >
          <Image src={getCharacterPortrait(characterKey)} alt="" fill sizes="112px" className="object-cover" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <CharacterGameInfo
            characterKey={characterKey}
            travelerElement={travelerElement}
            onTravelerElement={setTravelerElement}
          />
        </div>
      </div>
      {isTraveler(characterKey) && !travelerElement && <ChooseElementHint />}
      {extras.talents && <TalentButtons talents={extras.talents} />}
      {stats && <BaseStats stats={extras.stats} level={90} loading={extras.loading} variant="tiles" />}
      <ConstellationPicker constellations={extras.constellations} loading={extras.loading} />
      {footer && (
        <div className="border-t border-gray-200 pt-4 dark:border-slate-700 [&>div]:mb-0">
          {user ? (
            <p className="text-sm text-gray-600 dark:text-slate-400">
              You don&apos;t have this character in your latest upload.
            </p>
          ) : (
            <SignedOutBanner>Log in to see your build for {name}.</SignedOutBanner>
          )}
        </div>
      )}
    </>
  );
}
