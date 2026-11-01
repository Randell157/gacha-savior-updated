"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/header";
import Footer from "@/components/footer";

/** A login failure whose message is safe to show as-is. */
class LoginError extends Error {}

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const { user, loading } = useAuth();

  useEffect(() => {
    setIsClient(true);
  }, []);

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
        if (!response.ok || typeof result.email !== "string") {
          throw new LoginError(
            result.error ??
              "Failed to log in. Please check your credentials and try again."
          );
        }
        email = result.email;
      }

      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (error) {
      setError(
        error instanceof LoginError
          ? error.message
          : "Failed to log in. Please check your credentials and try again."
      );
      console.error("Login failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isClient) {
    return null; // Return null on the server side and during initial client-side render
  }

  if (typeof window === "undefined") {
    return null;
  }

  if (user) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="min-h-screen bg-gradient-to-b from-indigo-100 to-purple-100 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
          <div className="w-full max-w-md">
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <header className="bg-white shadow sm:shadow-none px-6 py-6">
                <h1 className="text-2xl font-bold text-indigo-900 text-center">
                  Enter Login Information
                </h1>
              </header>
              <div className="px-6 pb-6 space-y-6">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="rounded-md shadow-sm -space-y-px">
                <div>
                  <label htmlFor="email" className="sr-only">
                    Email address or Username
                  </label>
                  <input
                    id="identifier"
                    name="identifier"
                    type="text"
                    autoComplete="email"
                    required
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Email address or Username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="password" className="sr-only">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
              {error && (
                <div className="text-red-500 text-sm text-center">{error}</div>
              )}
              <div>
                <button
                  type="submit"
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  disabled={isLoading}
                >
                  {isLoading ? "Logging in..." : "Log in"}
                </button>
              </div>
            </form>
            <div className="text-sm text-center pt-2">
              Don&apos;t have an account?{" "}
              <Link
                href="/create-account"
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Create one here
              </Link>
            </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
