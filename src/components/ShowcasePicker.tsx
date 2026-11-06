"use client";

import { Button } from "@/components/ui/button";
import CharacterPicker from "@/components/CharacterPicker";

/** A showcase slot's button and picker. Characters in other slots stay in the grid, greyed out. */
export default function ShowcasePicker({
  slot,
  value,
  characterKeys,
  showcaseKeys,
  onChange,
  startLabel,
}: {
  /** 0-based position of this slot */
  slot: number;
  value: string | null;
  /** Every owned character's GOOD key */
  characterKeys: string[];
  showcaseKeys: (string | null)[];
  onChange: (characterKey: string | null) => void;
  /** The button's words when nothing is picked yet and the showcase is one line, such as "Choose characters" */
  startLabel?: string;
}) {
  const action = value ? "Change" : "Choose";
  return (
    <CharacterPicker
      value={value}
      characterKeys={characterKeys}
      onChange={onChange}
      clearLabel="Clear slot"
      unavailable={(key) => {
        const heldBy = showcaseKeys.findIndex((k, i) => k === key && i !== slot);
        return heldBy >= 0 ? `in slot ${heldBy + 1}` : null;
      }}
      trigger={
        <Button
          type="button"
          variant="outline"
          aria-label={startLabel ? undefined : `${action} character for slot ${slot + 1}`}
          data-showcase-start={startLabel ? "" : undefined}
          className={startLabel ? "w-full sm:w-auto" : "mt-auto h-9 w-full text-xs"}
        >
          {startLabel ?? `${action} character`}
        </Button>
      }
    />
  );
}
