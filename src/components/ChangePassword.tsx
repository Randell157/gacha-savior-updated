"use client";

import { useRef, useState } from "react";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CHANGE_ERRORS: Record<string, string> = {
  "auth/invalid-credential": "That current password isn't right.",
  "auth/wrong-password": "That current password isn't right.",
  "auth/weak-password": "Choose a password with at least 6 characters.",
  "auth/too-many-requests": "Too many tries. Wait a few minutes and try again.",
};

/** Profile's Password row: dots and a Change link that opens the form. */
export default function ChangePassword() {
  const [isOpen, setIsOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [changed, setChanged] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);

  const reset = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) {
      setError("The new passwords don't match.");
      return;
    }
    const user = auth.currentUser;
    if (!user?.email) {
      setError("Couldn't change your password. Please try again.");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      // Firebase wants a recent sign-in before it changes a password.
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, current));
      await updatePassword(user, next);
      reset();
      setIsOpen(false);
      setChanged(true);
      // The button that had focus just went away with the form.
      toggle.current?.focus();
    } catch (error) {
      setError(
        (error instanceof FirebaseError && CHANGE_ERRORS[error.code]) ||
          "Couldn't change your password. Please try again."
      );
      console.error("Password change failed:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <span className="flex flex-wrap items-baseline gap-x-4">
        <span aria-hidden="true">••••••••</span>
        {/* The negative margin keeps a 44 px tap area without making the row taller. */}
        <button
          ref={toggle}
          type="button"
          aria-expanded={isOpen}
          aria-label={isOpen ? "Cancel changing password" : "Change password"}
          onClick={() => {
            reset();
            setChanged(false);
            setIsOpen((open) => !open);
          }}
          className="-my-3 inline-flex min-h-11 items-center rounded font-medium text-indigo-600 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-indigo-400"
        >
          {isOpen ? "Cancel" : "Change"}
        </button>
      </span>
      {changed && (
        <p role="status" className="mt-2 text-green-700 dark:text-green-300">
          Your password was changed.
        </p>
      )}
      {isOpen && (
        <form className="mt-3 max-w-sm space-y-3" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="current-password" className="sr-only">
              Current password
            </label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              required
              autoFocus
              placeholder="Current password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="new-password" className="sr-only">
              New password
            </label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              placeholder="New password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="confirm-new-password" className="sr-only">
              Confirm new password
            </label>
            <Input
              id="confirm-new-password"
              type="password"
              autoComplete="new-password"
              required
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-red-600 dark:text-red-300">
              {error}
            </p>
          )}
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save password"}
          </Button>
        </form>
      )}
    </>
  );
}
