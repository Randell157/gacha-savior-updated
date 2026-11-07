"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sendPasswordResetEmail } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { CenteredPage } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** A failure whose message is safe to show as-is. */
class ResetError extends Error {}

const SEND_FAILED = "Couldn't send the link right now. Please try again.";

/** The account's email for a username, or null if there's no such account. */
async function emailForUsername(username: string): Promise<string | null> {
  const response = await fetch("/api/auth/resolve-username", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  const result = await response.json().catch(() => ({}));
  if (response.status === 401) return null;
  if (!response.ok || typeof result.email !== "string") {
    throw new ResetError(result.error ?? SEND_FAILED);
  }
  return result.email;
}

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const sentMessage = useRef<HTMLParagraphElement>(null);
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) router.push("/dashboard");
  }, [user, loading, router]);

  // The button that had focus is gone once the link is sent.
  useEffect(() => {
    if (sent) sentMessage.current?.focus();
  }, [sent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setError("");

    try {
      const typed = identifier.trim();
      const email = typed.includes("@") ? typed : await emailForUsername(typed);
      if (email) await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (error) {
      // An unknown account looks the same as a known one, so this page can't
      // be used to find out who has an account.
      if (error instanceof FirebaseError && error.code === "auth/user-not-found") {
        setSent(true);
      } else {
        setError(
          error instanceof ResetError
            ? error.message
            : error instanceof FirebaseError && error.code === "auth/invalid-email"
              ? "That email address doesn't look right. Check it and try again."
              : error instanceof FirebaseError && error.code === "auth/too-many-requests"
                ? "Too many tries. Wait a few minutes and try again."
                : SEND_FAILED
        );
        console.error("Password reset failed:", error);
      }
    } finally {
      setIsSending(false);
    }
  };

  if (user) {
    return null;
  }

  return (
    <CenteredPage>
      <div className="w-full max-w-md bg-white dark:bg-slate-900 shadow sm:rounded-lg px-6 py-8">
        <h1 className="text-2xl font-bold text-indigo-900 dark:text-indigo-200 text-center mb-2">
          Reset your password
        </h1>
        <p className="text-sm text-center text-gray-600 dark:text-slate-400 mb-6">
          Enter your email or username, and we&apos;ll email you a link to set a new password.
        </p>
        {sent ? (
          <p
            ref={sentMessage}
            tabIndex={-1}
            role="status"
            className="fade-up rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800 outline-none dark:border-green-800 dark:bg-green-900/30 dark:text-green-300"
          >
            If that account exists, a link is on its way. Check your spam folder if you don&apos;t see it in
            a few minutes.
          </p>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="identifier" className="sr-only">
                Email or username
              </label>
              <Input
                id="identifier"
                type="text"
                autoComplete="username"
                required
                placeholder="Email or username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>
            {error && (
              <p role="alert" className="text-red-600 dark:text-red-300 text-sm text-center">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={isSending}>
              {isSending ? "Sending..." : "Send reset link"}
            </Button>
          </form>
        )}
        <p className="text-sm text-center pt-6">
          <Link
            href="/login"
            className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
          >
            Back to log in
          </Link>
        </p>
      </div>
    </CenteredPage>
  );
}
