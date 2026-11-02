"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  username: string | null;
  /** When the account was created (users/{uid}.createdAt, an ISO string) */
  createdAt: string | null;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  username: null,
  createdAt: null,
  loading: true,
  error: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribeProfile?.();
        unsubscribeProfile = undefined;
        setUser(user);
        if (!user) {
          setUsername(null);
          setCreatedAt(null);
          setLoading(false);
          return;
        }
        setLoading(true);
        // Listen instead of reading once: right after sign-up, the profile is
        // written a moment after the account exists.
        unsubscribeProfile = onSnapshot(
          doc(db, "users", user.uid),
          (snapshot) => {
            const profile = snapshot.exists() ? snapshot.data() : undefined;
            setUsername(profile?.username ?? null);
            setCreatedAt(typeof profile?.createdAt === "string" ? profile.createdAt : null);
            setLoading(false);
          },
          (err) => {
            // Signing out can cancel the listener with a permission error.
            if (auth.currentUser?.uid !== user.uid) return;
            console.error("Error fetching user data:", err);
            setError("Failed to fetch user data. Please try again.");
            setLoading(false);
          }
        );
      },
      (err) => {
        console.error("Auth state change error:", err);
        setError("Authentication error. Please try again.");
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
      unsubscribeProfile?.();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, username, createdAt, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
};
