"use client";

import { useRef, useState } from "react";
import { EmailAuthProvider, reauthenticateWithCredential, signOut } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { auth } from "@/lib/firebase";
import { clearRememberedTabState } from "@/hooks/useRememberedState";
import { useGenshinData } from "@/hooks/useGenshinData";
import { useWishData } from "@/hooks/useWishData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const DELETE_BUTTON =
  "shrink-0 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950 dark:hover:text-red-200";

const ACCOUNT_ERRORS: Record<string, string> = {
  "auth/invalid-credential": "That password isn't right.",
  "auth/wrong-password": "That password isn't right.",
  "auth/too-many-requests": "Too many tries. Wait a few minutes and try again.",
};

function Row({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-gray-200 px-4 py-4 first-of-type:border-t-0 dark:border-slate-700 sm:px-6">
      <div className="min-w-0 flex-[1_1_16rem]">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">{title}</h3>
        <p className="mt-0.5 text-sm text-gray-600 dark:text-slate-400">{text}</p>
      </div>
      {action}
    </div>
  );
}

/**
 * Profile's panel for deleting the upload, the wish history or the whole
 * account. The upload and the wish history are deleted separately (option "A"
 * from `.mockups/delete-wishes.html`): wishes older than the game's six months
 * may exist nowhere else.
 */
export default function DeleteData() {
  const { data } = useGenshinData();
  const { wishes } = useWishData();
  const [deleted, setDeleted] = useState<"upload" | "wishes" | null>(null);
  const message = useRef<HTMLParagraphElement>(null);

  return (
    <section
      aria-labelledby="delete-data"
      className="overflow-hidden bg-white shadow dark:bg-slate-900 sm:rounded-lg"
    >
      <h2
        id="delete-data"
        className="px-4 pt-4 text-base font-semibold text-indigo-900 dark:text-indigo-200 sm:px-6"
      >
        Delete data
      </h2>
      {deleted && (
        <p
          key={deleted}
          ref={message}
          tabIndex={-1}
          role="status"
          className="fade-up mx-4 mt-3 rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800 outline-none dark:border-green-800 dark:bg-green-900/30 dark:text-green-300 sm:mx-6"
        >
          {deleted === "upload" ? "Your upload was deleted." : "Your wish history was deleted."}
        </p>
      )}
      <div>
        {data && (
          <Row
            title="Delete my upload"
            text="Removes your Genshin data but keeps your account and your wish history."
            action={
              <DeleteUpload
                onDeleted={() => setDeleted("upload")}
                focusMessage={() => message.current?.focus()}
              />
            }
          />
        )}
        {wishes && wishes.pulls.length > 0 && (
          <Row
            title="Delete my wish history"
            text="Removes your saved wishes. Your upload and account stay."
            action={
              <DeleteWishes
                count={wishes.pulls.length}
                onDeleted={() => setDeleted("wishes")}
                focusMessage={() => message.current?.focus()}
              />
            }
          />
        )}
        <Row
          title="Delete my account"
          text="Removes your account and everything in it, for good."
          action={<DeleteAccount />}
        />
      </div>
    </section>
  );
}

function DeleteUpload({ onDeleted, focusMessage }: { onDeleted: () => void; focusMessage: () => void }) {
  const { deleteUpload } = useGenshinData();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const deleted = useRef(false);

  const confirm = async () => {
    setIsDeleting(true);
    setError("");
    try {
      await deleteUpload();
      deleted.current = true;
      setIsOpen(false);
      onDeleted();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Check your connection and try again.");
      setIsDeleting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (isDeleting) return;
        setError("");
        setIsOpen(open);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className={DELETE_BUTTON}>
          Delete upload
        </Button>
      </DialogTrigger>
      <DialogContent
        onCloseAutoFocus={(e) => {
          // The button that opened this goes away with the upload.
          if (deleted.current) {
            e.preventDefault();
            focusMessage();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Delete your upload?</DialogTitle>
          <DialogDescription>
            This removes your Genshin characters, weapons, artifacts, materials, showcase and Traveler
            element. Your account stays, and you can upload again any time.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-300">
            Couldn&apos;t delete your upload. {error}
          </p>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" disabled={isDeleting} onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={isDeleting} onClick={confirm}>
            {isDeleting ? "Deleting..." : "Delete upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteWishes({
  count,
  onDeleted,
  focusMessage,
}: {
  count: number;
  onDeleted: () => void;
  focusMessage: () => void;
}) {
  const { deleteHistory } = useWishData();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const deleted = useRef(false);

  const confirm = async () => {
    setIsDeleting(true);
    setError("");
    try {
      await deleteHistory();
      deleted.current = true;
      setIsOpen(false);
      onDeleted();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Check your connection and try again.");
      setIsDeleting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (isDeleting) return;
        setError("");
        setIsOpen(open);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className={DELETE_BUTTON}>
          Delete wish history
        </Button>
      </DialogTrigger>
      <DialogContent
        onCloseAutoFocus={(e) => {
          // The button that opened this goes away with the history.
          if (deleted.current) {
            e.preventDefault();
            focusMessage();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Delete your wish history?</DialogTitle>
          <DialogDescription>
            This removes all {count.toLocaleString("en-US")} saved wishes. The game only shows the last six months, so
            older wishes come back only if you still have a file that holds them, such as a paimon.moe export.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-300">
            Couldn&apos;t delete your wish history. {error}
          </p>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" disabled={isDeleting} onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={isDeleting} onClick={confirm}>
            {isDeleting ? "Deleting..." : "Delete wish history"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteAccount() {
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user?.email) {
      setError("Log out, log back in, and try again.");
      return;
    }

    setIsDeleting(true);
    setError("");
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
      const token = await user.getIdToken(true);
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        setError(result.error ?? "Couldn't delete your account. Please try again.");
        setIsDeleting(false);
        return;
      }
      await signOut(auth).catch(() => {});
      clearRememberedTabState();
      // A full load, so RequireAuth's move to /login can't win over this.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- see above
      window.location.assign("/");
    } catch (error) {
      setError(
        (error instanceof FirebaseError && ACCOUNT_ERRORS[error.code]) ||
          "Couldn't delete your account. Please try again."
      );
      console.error("Deleting account failed:", error);
      setIsDeleting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (isDeleting) return;
        setPassword("");
        setError("");
        setIsOpen(open);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className={DELETE_BUTTON}>
          Delete account
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogDescription>
            This permanently removes your account, your username and everything you uploaded. It
            can&apos;t be undone. Enter your password to confirm.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="delete-account-password" className="sr-only">
              Password
            </label>
            <Input
              id="delete-account-password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-300">
              {error}
            </p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" disabled={isDeleting} onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
