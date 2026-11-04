"use client";

import { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import CharacterGameInfo from "@/components/CharacterGameInfo";
import SignedOutBanner from "@/components/SignedOutBanner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getCharacterPortrait, getCharacterRarity, rarityBackground } from "@/lib/genshinCharacters";
import { cn, formatCharacterDisplayName } from "@/lib/utils";

/**
 * The dialog from a tile for a character the visitor doesn't own (signed out,
 * that's all of them): the character's game info, and a log-in prompt if signed out.
 */
export default function CharacterQuickView({
  characterKey,
  onClose,
}: {
  characterKey: string | null;
  onClose: () => void;
}) {
  const { user } = useAuth();
  // Not saved: only a Traveler in an upload has a saved element.
  const [travelerElement, setTravelerElement] = useState<string | null>(null);
  const name = characterKey ? formatCharacterDisplayName(characterKey) : "";
  return (
    <Dialog open={characterKey !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent aria-describedby={undefined} className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogTitle className="text-xl font-bold text-indigo-900 dark:text-indigo-200">{name}</DialogTitle>
        {characterKey && (
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
              <div className="flex-1 space-y-3">
                <CharacterGameInfo
                  characterKey={characterKey}
                  travelerElement={travelerElement}
                  onTravelerElement={setTravelerElement}
                />
              </div>
            </div>
            <div className="border-t border-gray-200 pt-4 dark:border-slate-700 [&>div]:mb-0">
              {user ? (
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  You don&apos;t have this character in your latest upload.
                </p>
              ) : (
                <SignedOutBanner>Log in to see your build for {name}.</SignedOutBanner>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
