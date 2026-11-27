"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Pencil, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGenshinData } from "@/hooks/useGenshinData";
import {
  allTags,
  NO_NOTE,
  NOTE_MAX,
  presetSuggestions,
  sameTag,
  splitTags,
  TAG_MAX,
  TAGS_PER_CHARACTER,
  tagSuggestions,
  updateCharacterNote,
} from "@/lib/genshin/characterNotes";

const PANEL = "bg-white dark:bg-slate-900 shadow sm:rounded-lg p-6 sm:p-8";
const SUGGESTIONS_SHOWN = 10;

function TagChip({ children }: { children: React.ReactNode }) {
  return (
    <li className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-sm font-medium text-indigo-800 ring-1 ring-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-200 dark:ring-indigo-800">
      <Tag className="h-3 w-3" aria-hidden />
      {children}
    </li>
  );
}

/**
 * The player's own note and tags on an owned character (design "1B" and "2A"
 * from `.mockups/notes-tags.html`): a panel between the profile and Weapon,
 * which turns into a note box and a tag box when edited.
 */
export default function CharacterNotes({ characterKey, name }: { characterKey: string; name: string }) {
  const { data, characterNotes, setCharacterNotes } = useGenshinData();
  // Only characters in the upload count toward the tag limit and the suggestions.
  const owned = useMemo(() => new Set((data?.characters ?? []).map((c) => c.key)), [data]);
  const saved = characterNotes[characterKey] ?? NO_NOTE;
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const openButton = useRef<HTMLButtonElement>(null);
  const noteBox = useRef<HTMLTextAreaElement>(null);
  const tagBox = useRef<HTMLInputElement>(null);
  // Where focus goes once the panel switches: into the note box, or back to the button that opened it.
  const focusNext = useRef<"note" | "button" | null>(null);
  const id = useId();

  useEffect(() => {
    if (focusNext.current === "note") noteBox.current?.focus();
    if (focusNext.current === "button") openButton.current?.focus();
    focusNext.current = null;
  }, [editing]);

  const start = () => {
    setNote(saved.note);
    setTags(saved.tags);
    setTyped("");
    setError(null);
    setStatus("");
    focusNext.current = "note";
    setEditing(true);
  };

  const stop = () => {
    focusNext.current = "button";
    setEditing(false);
  };

  /** The tags with what's typed (or pasted, split at commas) added, in the spelling already in use. */
  const withTyped = (raw: string) => {
    const next = [...tags];
    for (const tag of splitTags(raw)) {
      if (next.some((t) => sameTag(t, tag))) continue;
      next.push(allTags(characterNotes).find((t) => sameTag(t, tag)) ?? tag);
    }
    return next;
  };

  /** Adds tags, checking the limits as they're added, not only on Save. */
  const addTag = (raw: string) => {
    const next = withTyped(raw);
    if (next.length > TAGS_PER_CHARACTER) {
      setError(`A character can have at most ${TAGS_PER_CHARACTER} tags. Remove one to add another.`);
      return;
    }
    const check = updateCharacterNote(characterNotes, characterKey, { note: "", tags: next }, owned);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setTags(next);
    setTyped("");
    setError(null);
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
    setError(null);
    // Cleared first, so removing the same tag twice is announced both times.
    setStatus("");
    requestAnimationFrame(() => setStatus(`Removed the tag ${tag}.`));
    tagBox.current?.focus();
  };

  const save = async () => {
    // A tag still in the box is saved too.
    const result = updateCharacterNote(characterNotes, characterKey, { note, tags: withTyped(typed) }, owned);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaving(true);
    const ok = await setCharacterNotes(result.notes);
    setSaving(false);
    if (!ok) {
      setError("Your note and tags couldn't be saved. Check your connection and try again.");
      return;
    }
    setStatus("Note and tags saved.");
    stop();
  };

  const full = tags.length >= TAGS_PER_CHARACTER;
  const inUse = allTags(characterNotes, owned);
  const suggestions = editing ? tagSuggestions(inUse, tags, typed).slice(0, SUGGESTIONS_SHOWN) : [];
  // Presets you don't use yet; once a character has one, it's under Your tags instead.
  const presets = editing ? presetSuggestions(inUse, tags, typed) : [];
  const empty = !saved.note && saved.tags.length === 0;
  const headingId = `${id}-heading`;

  return (
    <section aria-labelledby={headingId} className={PANEL}>
      <div className="flex items-center justify-between gap-3">
        <h2 id={headingId} className="text-lg font-semibold text-indigo-900 dark:text-indigo-200">
          Notes
        </h2>
        {!editing && !empty && (
          <Button ref={openButton} type="button" variant="outline" size="sm" onClick={start}>
            <Pencil className="mr-1.5 h-4 w-4" aria-hidden />
            Edit<span className="sr-only"> note and tags</span>
          </Button>
        )}
      </div>

      {!editing && empty && (
        <div className="mt-3">
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Your own words on {name}: a note to remember what they need, and tags to group them on the
            Characters page.
          </p>
          <Button ref={openButton} type="button" variant="outline" className="mt-3" onClick={start}>
            Add a note or tags
          </Button>
        </div>
      )}

      {!editing && !empty && (
        <div className="mt-3">
          {saved.tags.length > 0 && (
            <ul aria-label="Tags" className="flex flex-wrap gap-1.5">
              {saved.tags.map((tag) => (
                <TagChip key={tag}>{tag}</TagChip>
              ))}
            </ul>
          )}
          {saved.note ? (
            <p className="mt-3 whitespace-pre-line break-words text-sm text-gray-800 first:mt-0 dark:text-slate-200">
              {saved.note}
            </p>
          ) : (
            <p className="mt-3 text-sm text-gray-500 dark:text-slate-400">No note yet.</p>
          )}
        </div>
      )}

      {editing && (
        <div
          className="mt-3 space-y-4"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              stop();
            }
          }}
        >
          <div>
            <label htmlFor={`${id}-note`} className="mb-1 block text-sm font-medium text-gray-800 dark:text-slate-200">
              Note
            </label>
            <textarea
              ref={noteBox}
              id={`${id}-note`}
              value={note}
              maxLength={NOTE_MAX}
              rows={3}
              onChange={(event) => setNote(event.target.value)}
              placeholder="For example: waiting on a better goblet"
              aria-describedby={`${id}-note-left`}
              className="block w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-400 md:text-sm"
            />
            <p id={`${id}-note-left`} className="mt-1 text-xs text-gray-500 dark:text-slate-400">
              {NOTE_MAX - note.length} characters left
            </p>
          </div>

          <div>
            <label htmlFor={`${id}-tag`} className="mb-1 block text-sm font-medium text-gray-800 dark:text-slate-200">
              Tags
            </label>
            <div
              className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500 dark:border-slate-600 dark:bg-slate-950"
              onClick={(event) => {
                if (event.target === event.currentTarget) tagBox.current?.focus();
              }}
            >
              {tags.length > 0 && (
                <ul aria-label="Tags on this character" className="contents">
                  {tags.map((tag) => (
                    <li
                      key={tag}
                      className="inline-flex items-center gap-0.5 rounded-full bg-indigo-50 py-0.5 pl-2.5 pr-0.5 text-sm font-medium text-indigo-800 ring-1 ring-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-200 dark:ring-indigo-800"
                    >
                      {tag}
                      <button
                        type="button"
                        aria-label={`Remove the tag ${tag}`}
                        onClick={() => removeTag(tag)}
                        className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-indigo-800"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <input
                ref={tagBox}
                id={`${id}-tag`}
                value={typed}
                maxLength={TAG_MAX}
                // Read-only rather than disabled when full, so focus stays here and Backspace still works.
                readOnly={full}
                aria-disabled={full || undefined}
                onChange={(event) => setTyped(event.target.value)}
                onKeyDown={(event) => {
                  // Enter that finishes an IME composition (Japanese, Chinese) isn't "add".
                  if (event.nativeEvent.isComposing) return;
                  if (event.key === "Enter" || event.key === ",") {
                    event.preventDefault();
                    addTag(typed);
                  } else if (event.key === "Backspace" && typed === "" && tags.length > 0) {
                    removeTag(tags[tags.length - 1]);
                  }
                }}
                placeholder={full ? "" : "Add a tag"}
                aria-describedby={`${id}-tag-help`}
                className="min-w-[8rem] flex-1 bg-transparent px-1 py-0.5 text-base text-gray-900 placeholder:text-gray-500 read-only:cursor-default focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-400 md:text-sm"
              />
            </div>
            <p id={`${id}-tag-help`} className="mt-1 text-xs text-gray-500 dark:text-slate-400">
              {tags.length} of {TAGS_PER_CHARACTER} tags.{" "}
              {full ? "Remove one to add another." : "Press Enter to add one."}
            </p>
            {!full &&
              [
                { label: "Your tags:", rowId: `${id}-yours`, list: suggestions },
                { label: "Suggestions:", rowId: `${id}-presets`, list: presets },
              ]
                .filter(({ list }) => list.length > 0)
                .map(({ label, rowId, list }) => (
                  <div key={rowId} className="mt-2">
                    <p id={rowId} className="text-xs text-gray-500 dark:text-slate-400">
                      {label}
                    </p>
                    <ul aria-labelledby={rowId} className="mt-1 flex flex-wrap gap-1.5">
                      {list.map((tag) => (
                        <li key={tag}>
                          <button
                            type="button"
                            onClick={() => {
                              addTag(tag);
                              tagBox.current?.focus();
                            }}
                            aria-label={`Add the tag ${tag}`}
                            className="rounded-full border border-dashed border-gray-300 px-2.5 py-0.5 text-sm text-gray-700 hover:border-indigo-400 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-indigo-900/40"
                          >
                            + {tag}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button type="button" variant="outline" onClick={stop} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <p role="status" className="sr-only">
        {status}
      </p>
    </section>
  );
}
