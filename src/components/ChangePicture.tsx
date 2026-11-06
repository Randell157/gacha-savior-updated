"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useGenshinData } from "@/hooks/useGenshinData";
import CharacterPicker from "@/components/CharacterPicker";
import PictureCropper, { MIN_CROP_SIZE, type PictureSource } from "@/components/PictureCropper";
import ProfilePicture from "@/components/ProfilePicture";

const LINK =
  "-my-3 inline-flex min-h-11 items-center rounded font-medium text-indigo-600 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-indigo-400";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** Decodes a chosen file; rejects with a message for the player. */
function readImage(file: File): Promise<PictureSource> {
  if (!IMAGE_TYPES.includes(file.type)) {
    return Promise.reject(new Error("Choose a JPG, PNG or WebP image."));
  }
  if (file.size > MAX_FILE_BYTES) {
    return Promise.reject(new Error("That image is over 10 MB. Choose a smaller one."));
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      if (Math.min(image.naturalWidth, image.naturalHeight) < MIN_CROP_SIZE) {
        URL.revokeObjectURL(url);
        reject(new Error(`That image is too small. Choose one at least ${MIN_CROP_SIZE} px on its shorter side.`));
      } else {
        resolve({ url, image });
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read that image. Try another one."));
    };
    image.src = url;
  });
}

/**
 * Profile's Picture row: one of your characters (users/{uid}.avatar) or your own
 * cropped image (users/{uid}.avatarImage). Choosing one clears the other, and
 * AuthContext's listener shows the result.
 */
export default function ChangePicture() {
  const { user, avatar, avatarImage } = useAuth();
  const { data } = useGenshinData();
  const [source, setSource] = useState<PictureSource | null>(null);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadButton = useRef<HTMLButtonElement>(null);

  const save = async (fields: { avatar: string | null; avatarImage: string | null }) => {
    if (!user) throw new Error("Not signed in");
    await updateDoc(doc(db, "users", user.uid), fields);
  };

  const saveQuietly = async (fields: { avatar: string | null; avatarImage: string | null }) => {
    setError("");
    try {
      await save(fields);
    } catch (error) {
      console.error("Saving picture failed:", error);
      setError("Couldn't save your picture. Check your connection and try again.");
    }
  };

  const closeCropper = () => {
    if (source) URL.revokeObjectURL(source.url);
    setSource(null);
    uploadButton.current?.focus();
  };

  return (
    <>
      <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <ProfilePicture size={56} />
        {data && (
          <CharacterPicker
            value={avatar}
            characterKeys={data.characters.map((character) => character.key)}
            onChange={(key) => saveQuietly({ avatar: key, avatarImage: null })}
            trigger={
              <button type="button" className={LINK}>
                Choose character
              </button>
            }
          />
        )}
        <button ref={uploadButton} type="button" className={LINK} onClick={() => fileInput.current?.click()}>
          Upload image
        </button>
        {(avatar || avatarImage) && (
          <button
            type="button"
            className={LINK}
            onClick={() => saveQuietly({ avatar: null, avatarImage: null })}
          >
            Remove picture
          </button>
        )}
      </span>
      <input
        ref={fileInput}
        type="file"
        accept={IMAGE_TYPES.join(",")}
        aria-label="Upload a profile picture"
        tabIndex={-1}
        className="sr-only"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          // So choosing the same file again still counts as a change.
          e.target.value = "";
          if (!file) return;
          setError("");
          try {
            setSource(await readImage(file));
          } catch (error) {
            setError(error instanceof Error ? error.message : "Couldn't read that image. Try another one.");
          }
        }}
      />
      {!data && (
        <p className="mt-2 text-gray-600 dark:text-slate-400">
          <Link href="/genshin" className={LINK}>
            Upload an export
          </Link>{" "}
          to choose one of your characters instead.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-red-600 dark:text-red-300">
          {error}
        </p>
      )}
      {source && (
        <PictureCropper
          source={source}
          onSave={(picture) => save({ avatar: null, avatarImage: picture })}
          onClose={closeCropper}
        />
      )}
    </>
  );
}
