"use client";

import { useRef, useState } from "react";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const FAILED = "Couldn't change your username. Please try again.";

/** Profile's Username row: the name and a Change link that opens the form. */
export default function ChangeUsername() {
  const { username } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [next, setNext] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [changed, setChanged] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      setError("Log out, log back in, and try again.");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/account/username", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ username: next }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        setError(result.error ?? FAILED);
        return;
      }
      // The new name reaches the page through AuthContext's listener.
      setNext("");
      setIsOpen(false);
      setChanged(true);
      // The button that had focus just went away with the form.
      toggle.current?.focus();
    } catch (error) {
      setError(FAILED);
      console.error("Changing username failed:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <span className="flex flex-wrap items-baseline gap-x-4">
        <span className="min-w-0 break-words">{username ?? "—"}</span>
        {/* The negative margin keeps a 44 px tap area without making the row taller. */}
        <button
          ref={toggle}
          type="button"
          aria-expanded={isOpen}
          aria-label={isOpen ? "Cancel changing username" : "Change username"}
          onClick={() => {
            setNext("");
            setError("");
            setChanged(false);
            setIsOpen((open) => !open);
          }}
          className="-my-3 inline-flex min-h-11 items-center rounded font-medium text-indigo-600 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-indigo-400"
        >
          {isOpen ? "Cancel" : "Change"}
        </button>
      </span>
      {changed && (
        <p role="status" className="fade-up mt-2 text-green-700 dark:text-green-300">
          Your username was changed.
        </p>
      )}
      {isOpen && (
        <form className="mt-3 max-w-sm space-y-3" onSubmit={handleSubmit}>
          <p className="text-gray-600 dark:text-slate-400">
            Your old name becomes free for anyone else right away.
          </p>
          <div>
            <label htmlFor="new-username" className="sr-only">
              New username
            </label>
            <Input
              id="new-username"
              type="text"
              autoComplete="username"
              required
              autoFocus
              placeholder="New username"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-red-600 dark:text-red-300">
              {error}
            </p>
          )}
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save username"}
          </Button>
        </form>
      )}
    </>
  );
}
