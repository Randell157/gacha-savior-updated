"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import Genshin from "@/components/Genshin";
import GenshinShell from "@/components/GenshinShell";
import RequireAuth from "@/components/RequireAuth";
import { UploadBar, UploadDropZone } from "@/components/UploadArea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useGenshinData } from "@/hooks/useGenshinData";
import { parseGoodText } from "@/lib/genshin/parseGood";
import type { GenshinData } from "@/lib/genshin/types";

export default function GenshinOverviewPage() {
  return (
    <RequireAuth skeleton="dashboard">
      <GenshinOverview />
    </RequireAuth>
  );
}

/** "91 characters, 336 weapons and 1,717 artifacts" */
function describeCounts(data: GenshinData) {
  const n = (count: number, word: string) => `${count.toLocaleString()} ${word}`;
  return `${n(data.characters.length, "characters")}, ${n(data.weapons.length, "weapons")} and ${n(data.artifacts.length, "artifacts")}`;
}

function GenshinOverview() {
  const { error: authError } = useAuth();
  const {
    data: genshinData,
    showcase,
    setShowcase,
    loadError,
    lastUploadedAt,
    migratedFromLocal,
    save,
  } = useGenshinData();
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileWarnings, setFileWarnings] = useState<string[]>([]);
  const [savedSummary, setSavedSummary] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleFile = async (file: File) => {
    setSavedSummary(null);
    const result = parseGoodText(await file.text());
    if (!result.ok) {
      setFileError(result.error);
      setFileWarnings([]);
      return;
    }
    setIsSaving(true);
    try {
      await save(result.data);
      setFileError(null);
      setFileWarnings(result.warnings);
      setSavedSummary(describeCounts(result.data));
    } catch (error) {
      setFileError(
        `Your file was read, but saving it failed: ${error instanceof Error ? error.message : error}`
      );
      setFileWarnings([]);
    } finally {
      setIsSaving(false);
    }
  };

  const errorMessage =
    fileError ?? (loadError ? `Your saved data couldn't be loaded. ${loadError}` : null);

  if (authError) {
    return (
      <GenshinShell title="Genshin Impact">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{authError}</AlertDescription>
        </Alert>
      </GenshinShell>
    );
  }

  return (
    <GenshinShell title="Genshin Impact">
      <div className="space-y-4 mb-6 empty:hidden">
        {migratedFromLocal && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Your data was moved to your account</AlertTitle>
            <AlertDescription>
              Your upload used to be saved only in this browser. It&apos;s now
              saved to your account, so it shows up wherever you log in.
            </AlertDescription>
          </Alert>
        )}
        {savedSummary && (
          <Alert className="border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-200 [&>svg]:text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Saved</AlertTitle>
            <AlertDescription>{savedSummary}.</AlertDescription>
          </Alert>
        )}
        {errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        {fileWarnings.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Uploaded with some data skipped</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-5">
                {fileWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </div>
      {genshinData ? (
        <>
          <div className="mb-8">
            <UploadBar
              onFile={handleFile}
              disabled={isSaving}
              lastUploadedAt={lastUploadedAt}
              summary={describeCounts(genshinData)}
            />
          </div>
          <Genshin
            data={genshinData}
            showcase={showcase}
            onShowcaseChange={setShowcase}
            heading={false}
          />
        </>
      ) : (
        <UploadDropZone onFile={handleFile} disabled={isSaving} />
      )}
    </GenshinShell>
  );
}
