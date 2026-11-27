"use client";

import { useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { AlertCircle, CalendarDays, CheckCircle2, Download } from "lucide-react";
import GenshinShell from "@/components/GenshinShell";
import PageSkeleton from "@/components/PageSkeleton";
import RequireAuth from "@/components/RequireAuth";
import SignedOutBanner from "@/components/SignedOutBanner";
import { UploadBar, UploadDropZone } from "@/components/UploadArea";
import WishStats, { wishDate } from "@/components/WishStats";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import wishItems from "@/data/genshin/wishItems.json";
import { useSampleWishes } from "@/hooks/useSampleWishes";
import { useWishData } from "@/hooks/useWishData";
import { nameLookup, parsePaimon, parseUigfText, toUigf, type ParseUigfResult, type Pull, type WishAccount, type WishItem } from "@/lib/genshin/wishes";
import { formatUploadTime, cn } from "@/lib/utils";
import { readXlsx } from "@/lib/xlsx";
import { version } from "../../../../package.json";

// /genshin/wishes: the wish tracker (Phase 5; picks 1A 2A 3A 4A 5B from
// .mockups/wishes.html). Imports UIGF .json and paimon.moe .xlsx files,
// merges them into the saved history, and shows each banner's pity. Download
// saves the whole history as a UIGF v4 file (picks 2A and 3A from
// .mockups/wish-additions.html: a button in the import bar, and a dialog that
// asks for the UID each time when none is saved, as with paimon.moe imports).

const ITEMS = wishItems.items as Record<string, WishItem>;
const lookupId = (id: string) => ITEMS[id];
const lookupName = nameLookup(ITEMS);
const n = (value: number) => value.toLocaleString("en-US");
const wishes = (count: number) => `${n(count)} ${count === 1 ? "wish" : "wishes"}`;

export default function WishesPage() {
  return (
    <RequireAuth skeleton="cards" signedOut={<SampleWishes />}>
      <Wishes />
    </RequireAuth>
  );
}

const HOW_TO = (
  <>
    <li>
      On <b>paimon.moe</b>, export your wish history to Excel. It saves a .xlsx file.
    </li>
    <li>
      Or use a wish history tool that exports <b>UIGF</b>, such as Snap Hutao, and save a .json file.
    </li>
    <li>
      Drop that file above, or choose it with the link. Import again any time: only new wishes are added, and older ones
      stay even after the game stops showing them.
    </li>
  </>
);

/** Reads a dropped or chosen file: a paimon.moe .xlsx or a UIGF .json. */
async function readWishFile(file: File): Promise<ParseUigfResult> {
  if (file.name.toLowerCase().endsWith(".xlsx")) {
    try {
      return parsePaimon(await readXlsx(new Uint8Array(await file.arrayBuffer())), lookupName);
    } catch (error) {
      console.error("Reading the Excel file failed:", error);
      return { ok: false, error: "This Excel file couldn't be read. Export it again from paimon.moe and import the new file." };
    }
  }
  if (!file.name.toLowerCase().endsWith(".json")) {
    return { ok: false, error: "Choose a paimon.moe Excel file (.xlsx) or a UIGF wish history file (.json)." };
  }
  return parseUigfText(await file.text(), lookupId);
}

function Wishes() {
  const { wishes: saved, loading, loadError, importPulls } = useWishData();
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [done, setDone] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [choices, setChoices] = useState<WishAccount[] | null>(null);
  const [picked, setPicked] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const downloadButton = useRef<HTMLButtonElement>(null);

  if (loading) return <PageSkeleton kind="cards" />;

  const importAccount = async (account: WishAccount, fileWarnings: string[]) => {
    setSaving(true);
    try {
      const result = await importPulls(account.uid, account.pulls);
      setError(null);
      setWarnings(fileWarnings);
      setDone(
        result.added === 0
          ? `No new wishes: all ${wishes(result.inFile)} in this file were already saved.`
          : `${wishes(result.added)} added. ${n(result.inFile - result.added)} ${result.inFile - result.added === 1 ? "was" : "were"} already saved. You now have ${wishes(result.total)}.`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setWarnings([]);
    } finally {
      setSaving(false);
    }
  };

  const handleFile = async (file: File) => {
    setDone(null);
    const result = await readWishFile(file);
    if (!result.ok) {
      setError(result.error);
      setWarnings([]);
      return;
    }
    if (result.accounts.length > 1) {
      setPicked(0);
      setChoices(result.accounts);
      setWarnings(result.warnings);
      return;
    }
    await importAccount(result.accounts[0], result.warnings);
  };

  const errorTitle = error ? "Import failed" : "Couldn't load your wish history";
  const errorMessage = error ?? (loadError ? `Your saved wishes couldn't be opened. ${loadError}` : null);
  const pulls = saved?.pulls ?? [];
  const accept = ".json,.xlsx,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const inputLabel = "Import a wish history file (.xlsx or .json)";

  return (
    <GenshinShell title="Wishes">
      <div className="mb-6 space-y-4 empty:hidden">
        {done && (
          <Alert className="fade-up border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-200 [&>svg]:text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Import complete</AlertTitle>
            <AlertDescription>{done}</AlertDescription>
          </Alert>
        )}
        {errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{errorTitle}</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        {warnings.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Imported with some wishes skipped</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-5">
                {warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </div>

      {pulls.length > 0 ? (
        <>
          <div className="mb-6">
            <UploadBar
              onFile={handleFile}
              disabled={saving}
              accept={accept}
              inputLabel={inputLabel}
              lastUploadedAt={saved?.lastImportedAt ?? null}
              buttonLabel="Import a newer export"
              actions={
                <>
                  <Button ref={downloadButton} size="sm" variant="outline" onClick={() => setDownloading(true)}>
                    <Download className="mr-1.5 h-4 w-4" />
                    Download
                  </Button>
                  <Button asChild size="sm">
                    <Link href="/genshin/wishes/year">
                      <CalendarDays className="mr-1.5 h-4 w-4" />
                      Year in review
                    </Link>
                  </Button>
                </>
              }
              info={
                <>
                  {saved?.lastImportedAt && `Last import ${formatUploadTime(saved.lastImportedAt)} · `}
                  {wishes(pulls.length)} since {wishDate(pulls[0].time)}
                  {saved?.gameUid && ` · UID ${saved.gameUid}`}
                </>
              }
            />
          </div>
          <WishStats pulls={pulls} />
          <DownloadDialog
            open={downloading}
            onOpenChange={setDownloading}
            pulls={pulls}
            savedUid={saved?.gameUid ?? ""}
            returnFocus={downloadButton}
          />
        </>
      ) : (
        <UploadDropZone
          onFile={handleFile}
          disabled={saving}
          accept={accept}
          inputLabel={inputLabel}
          title="Import your wish history"
          format="paimon.moe .xlsx or UIGF .json"
          howToTitle="How do I export my wish history?"
          howTo={HOW_TO}
        />
      )}

      <Dialog open={choices !== null} onOpenChange={(open) => !open && setChoices(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose an account</DialogTitle>
            <DialogDescription>
              This file has wish history for {choices?.length} game accounts. Which one is yours to import?
            </DialogDescription>
          </DialogHeader>
          <fieldset className="space-y-2">
            <legend className="sr-only">Game account</legend>
            {choices?.map((account, i) => (
              <label
                key={account.uid}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-indigo-500 dark:border-slate-700",
                  i === picked && "border-transparent ring-2 ring-indigo-600 dark:ring-indigo-400"
                )}
              >
                <input
                  type="radio"
                  name="wish-account"
                  checked={i === picked}
                  onChange={() => setPicked(i)}
                  className="mt-1 h-4 w-4 shrink-0 accent-indigo-600 dark:accent-indigo-400"
                />
                <span>
                  <span className="block font-semibold">UID {account.uid}</span>
                  <span className="block text-xs text-gray-500 dark:text-slate-400">
                    {wishes(account.pulls.length)} · {wishDate(account.pulls[0].time)} to {wishDate(account.pulls.at(-1)!.time)}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Only one account&apos;s wishes are kept for now.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChoices(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const account = choices?.[picked];
                setChoices(null);
                if (account) void importAccount(account, warnings);
              }}
            >
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </GenshinShell>
  );
}

const UID = /^\d{9,10}$/;

/** "2026-11-12", in the player's own time zone. */
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Saves the history as a UIGF v4 file. UIGF needs the UID, which paimon.moe
 * files don't have, so with none saved the dialog asks for it (and doesn't keep it).
 */
function DownloadDialog({
  open,
  onOpenChange,
  pulls,
  savedUid,
  returnFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pulls: Pull[];
  savedUid: string;
  /** The button that opened it, which gets focus back when it closes. */
  returnFocus: RefObject<HTMLButtonElement | null>;
}) {
  const [typed, setTyped] = useState("");
  const [tried, setTried] = useState(false);
  const uid = savedUid || typed.trim();
  const valid = UID.test(uid);
  const fileName = `gacha-savior-wishes-${valid ? uid : "UID"}-${today()}.json`;

  const close = (next: boolean) => {
    if (!next) setTried(false);
    onOpenChange(next);
  };

  const download = () => {
    if (!valid) {
      setTried(true);
      return;
    }
    const file = toUigf(uid, pulls, { name: "Gacha Savior", version, exportedAt: new Date() });
    const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    close(false);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          returnFocus.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Download your wish history</DialogTitle>
          <DialogDescription>
            A UIGF v4 file (.json) with every wish saved here. Other wish trackers can import it, and so can this site.
          </DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
          <dt className="text-gray-500 dark:text-slate-400">Wishes</dt>
          <dd>
            {wishes(pulls.length)}, {wishDate(pulls[0].time)} to {wishDate(pulls.at(-1)!.time)}
          </dd>
          {savedUid && (
            <>
              <dt className="text-gray-500 dark:text-slate-400">UID</dt>
              <dd>{savedUid}</dd>
            </>
          )}
          <dt className="text-gray-500 dark:text-slate-400">File</dt>
          <dd className="break-all">{fileName}</dd>
        </dl>
        {!savedUid && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              download();
            }}
          >
            <label htmlFor="wish-uid" className="mb-1 block text-sm font-semibold">
              Your UID
            </label>
            <Input
              id="wish-uid"
              inputMode="numeric"
              autoComplete="off"
              placeholder="9 or 10 digits"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              aria-invalid={tried && !valid}
              aria-describedby="wish-uid-help"
            />
            <p id="wish-uid-help" className="mt-1 text-xs text-gray-500 dark:text-slate-400">
              {tried && !valid ? (
                <span className="font-medium text-red-600 dark:text-red-400">Enter your UID: 9 or 10 digits. </span>
              ) : null}
              paimon.moe files don&apos;t include it, and UIGF needs it. Find it in the bottom right corner of the game.
            </p>
          </form>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button onClick={download}>
            <Download className="mr-1.5 h-4 w-4" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Signed out: the made-up test history, so visitors can see what the page does. */
function SampleWishes() {
  const pulls = useSampleWishes();

  return (
    <GenshinShell title="Wishes">
      <SignedOutBanner>
        This is a made-up wish history. Log in to import your own and keep it after the game&apos;s six-month limit.
      </SignedOutBanner>
      {pulls === null ? (
        <p className="text-sm text-gray-500 dark:text-slate-400" aria-busy="true">
          Loading the sample...
        </p>
      ) : (
        pulls.length > 0 && (
          <>
            <div className="mb-4 flex justify-end">
              <Button asChild size="sm">
                <Link href="/genshin/wishes/year">
                  <CalendarDays className="mr-1.5 h-4 w-4" />
                  Year in review
                </Link>
              </Button>
            </div>
            <WishStats pulls={pulls} />
          </>
        )
      )}
    </GenshinShell>
  );
}
