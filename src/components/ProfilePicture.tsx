"use client";

import Image from "next/image";
import CharacterAvatar from "@/components/CharacterAvatar";
import { useAuth } from "@/contexts/AuthContext";

/** The account's uploaded image or chosen character, or the first letter of its name. */
export default function ProfilePicture({ size }: { size: number }) {
  const { user, username, avatar, avatarImage } = useAuth();
  if (avatarImage) {
    return (
      <Image
        src={avatarImage}
        alt=""
        width={size}
        height={size}
        unoptimized
        className="shrink-0 rounded-full object-cover"
      />
    );
  }
  if (avatar) return <CharacterAvatar characterKey={avatar} size={size} />;
  const letter = (username || user?.email || "?").charAt(0).toUpperCase();
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.45) }}
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-900 dark:bg-indigo-900 dark:text-indigo-200"
    >
      {letter}
    </span>
  );
}
