"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, deleteUser } from "firebase/auth";
import { doc, runTransaction } from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { auth, db } from "@/lib/firebase";
import { usernameProblem } from "@/lib/usernames";
import { CenteredPage } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

class UsernameTakenError extends Error {}

/** Messages for the sign-up failures people can fix themselves. */
const SIGN_UP_ERRORS: Record<string, string> = {
  "auth/email-already-in-use": "That email already has an account. Log in instead.",
  "auth/invalid-email": "That email address doesn't look right. Check it and try again.",
  "auth/weak-password": "Choose a password with at least 6 characters.",
};

export default function CreateAccountPage() {
  //Input States
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  //Form submission when button is clicked
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    //Validating password
    if (password !== confirmPassword) {
      setError("The passwords don't match.");
      setIsLoading(false);
      return;
    }

    // Usernames are Firestore document IDs, and login treats anything with
    // an "@" as an email (the rules are in src/lib/usernames.ts).
    const trimmedUsername = username.trim();
    const usernameError = usernameProblem(trimmedUsername);
    if (usernameError) {
      setError(usernameError);
      setIsLoading(false);
      return;
    }

    try {
      // Creating a new user account in Firebase
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Claim the username and store the profile together. The transaction
      // fails if someone already has the username, so it can't be overwritten.
      // The claim is stored lowercase so "Zach" and "zach" count as the same
      // name; the profile keeps it as typed, for display.
      try {
        await runTransaction(db, async (transaction) => {
          const usernameRef = doc(db, "usernames", trimmedUsername.toLowerCase());
          if ((await transaction.get(usernameRef)).exists()) {
            throw new UsernameTakenError();
          }
          transaction.set(usernameRef, { uid: user.uid });
          transaction.set(doc(db, "users", user.uid), {
            username: trimmedUsername,
            email,
            createdAt: new Date().toISOString(),
          });
        });
      } catch (claimError) {
        // Don't leave behind a login with no username or profile.
        await deleteUser(user).catch((deleteError) =>
          console.error("Couldn't remove incomplete account:", deleteError)
        );
        throw claimError;
      }

      //Redirect to dashboard
      router.push("/dashboard");
    } catch (error) {
      setError(
        error instanceof UsernameTakenError
          ? "That username is already taken. Please choose another."
          : (error instanceof FirebaseError && SIGN_UP_ERRORS[error.code]) ||
              "Couldn't create your account. Please try again."
      );
      console.error("Account creation failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CenteredPage>
      <div className="w-full max-w-md bg-white dark:bg-slate-900 shadow sm:rounded-lg px-6 py-8">
        <h1 className="text-2xl font-bold text-indigo-900 dark:text-indigo-200 text-center mb-6">
          Create account
        </h1>
        {/* The fields have no `name`, so a submit before the JavaScript loads can't put them in the address. */}
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-3">
            <div>
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                required
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="sr-only">
                Confirm password
              </label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          {error && (
            <p role="alert" className="text-red-600 dark:text-red-300 text-sm text-center">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Creating account..." : "Create account"}
          </Button>
        </form>
        <p className="text-sm text-center pt-6">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
          >
            Log in here
          </Link>
        </p>
      </div>
    </CenteredPage>
  );
}
