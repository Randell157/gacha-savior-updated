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
  /** The character chosen as the profile picture (users/{uid}.avatar) */
  avatar: string | null;
  /** The uploaded profile picture, a JPEG data URL (users/{uid}.avatarImage) */
  avatarImage: string | null;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  username: null,
  createdAt: null,
  avatar: null,
  avatarImage: null,
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
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
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
          setAvatar(null);
          setAvatarImage(null);
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
            setAvatar(typeof profile?.avatar === "string" ? profile.avatar : null);
            setAvatarImage(
              typeof profile?.avatarImage === "string" && profile.avatarImage.startsWith("data:image/jpeg;base64,")
                ? profile.avatarImage
                : null
            );
            setLoading(false);
          },
          (err) => {
            // Signing out can cancel the listener with a permission error.
            if (auth.currentUser?.uid !== user.uid) return;
            console.error("Error fetching user data:", err);
            setError("Refresh the page to try again.");
            setLoading(false);
          }
        );
      },
      (err) => {
        console.error("Auth state change error:", err);
        setError("Refresh the page to try again.");
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
      unsubscribeProfile?.();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, username, createdAt, avatar, avatarImage, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
};
