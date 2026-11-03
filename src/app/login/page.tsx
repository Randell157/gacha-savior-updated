"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { CenteredPage } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** A login failure whose message is safe to show as-is. */
class LoginError extends Error {}

// One message for every wrong-credentials case, so it doesn't reveal which
// part was wrong.
const BAD_CREDENTIALS =
  "That email, username or password isn't right. Check them and try again.";
const LOGIN_FAILED = "Couldn't log in right now. Please try again.";
const BAD_CREDENTIAL_CODES = new Set([
  "auth/invalid-credential",
  "auth/wrong-password",
  "auth/user-not-found",
  "auth/invalid-email",
]);

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { user, loading } = useAuth();

  const handleRedirect = useCallback(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  useEffect(() => {
    handleRedirect();
  }, [handleRedirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      let email = identifier.trim();
      // If the identifier is not an email, assume it's a username. The server
      // looks up the email, since users/{uid} isn't readable while signed out.
      if (!email.includes("@")) {
        const response = await fetch("/api/auth/resolve-username", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: email }),
        });
        const result = await response.json().catch(() => ({}));
        if (response.status === 401) {
          throw new LoginError(BAD_CREDENTIALS);
        }
        if (!response.ok || typeof result.email !== "string") {
          throw new LoginError(result.error ?? LOGIN_FAILED);
        }
        email = result.email;
      }

      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (error) {
      setError(
        error instanceof LoginError
          ? error.message
          : error instanceof FirebaseError && BAD_CREDENTIAL_CODES.has(error.code)
            ? BAD_CREDENTIALS
            : LOGIN_FAILED
      );
      console.error("Login failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // `user` is null on the server and until Firebase restores the session, so
  // the server and first client render match.
  if (user) {
    return null;
  }

  return (
    <CenteredPage>
      <div className="w-full max-w-md bg-white dark:bg-slate-900 shadow sm:rounded-lg px-6 py-8">
        <h1 className="text-2xl font-bold text-indigo-900 dark:text-indigo-200 text-center mb-6">
          Log in
        </h1>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-3">
            <div>
              <label htmlFor="identifier" className="sr-only">
                Email or username
              </label>
              <Input
                id="identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                required
                placeholder="Email or username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          {error && (
            <p role="alert" className="text-red-600 dark:text-red-300 text-sm text-center">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Log in"}
          </Button>
        </form>
        <p className="text-sm text-center pt-6">
          Don&apos;t have an account?{" "}
          <Link
            href="/create-account"
            className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
          >
            Create one here
          </Link>
        </p>
      </div>
    </CenteredPage>
  );
}
