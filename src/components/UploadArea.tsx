"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UploadProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

/** Hidden file input plus drag-and-drop handlers shared by both upload styles. */
function useFilePicker({ onFile, disabled }: UploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept=".json,application/json"
      aria-label="Upload a GOOD export (.json)"
      className="sr-only"
      tabIndex={-1}
      disabled={disabled}
      onChange={(e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (file) onFile(file);
      }}
    />
  );

  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setDragging(true);
    },
    onDragLeave: () => setDragging(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && !disabled) onFile(file);
    },
  };

  return { input, dragging, dropHandlers, open: () => inputRef.current?.click() };
}

/** Shown before the first upload: a drop zone with export instructions. */
export function UploadDropZone(props: UploadProps) {
  const { input, dragging, dropHandlers, open } = useFilePicker(props);

  return (
    <div>
      <div
        {...dropHandlers}
        className={cn(
          "rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors",
          dragging ? "border-indigo-500 bg-indigo-100/60 dark:bg-indigo-900/40" : "border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-900/20"
        )}
      >
        {input}
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-200 dark:ring-indigo-800">
          <Upload className="h-5 w-5" />
        </div>
        <p className="font-semibold text-gray-900 dark:text-slate-100">
          {props.disabled ? "Saving to your account..." : "Drop your Genshin export here"}
        </p>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          or{" "}
          <button
            type="button"
            onClick={open}
            disabled={props.disabled}
            className="font-medium text-indigo-600 dark:text-indigo-400 underline underline-offset-2 hover:text-indigo-500 dark:hover:text-indigo-300 disabled:opacity-50"
          >
            choose a file
          </button>{" "}
          · GOOD format .json
        </p>
      </div>
      <details className="mt-3 rounded-lg border px-4 py-3 text-sm" open>
        <summary className="cursor-pointer font-medium text-indigo-900 dark:text-indigo-200">
          How do I export my account?
        </summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-gray-600 dark:text-slate-400">
          <li>
            Run <b>Inventory Kamera</b> or <b>Irminsul</b> while Genshin Impact is open.
          </li>
          <li>
            Export in the <b>GOOD</b> format. It saves a .json file.
          </li>
          <li>Drop that file above, or choose it with the link.</li>
        </ol>
      </details>
    </div>
  );
}

/** Shown once data exists: last upload, counts and a button to upload again. */
export function UploadBar({
  lastUploadedAt,
  summary,
  ...props
}: UploadProps & { lastUploadedAt: Date | null; summary: string }) {
  const { input, dragging, dropHandlers, open } = useFilePicker(props);

  return (
    <div
      {...dropHandlers}
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors",
        dragging ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30" : "bg-white dark:bg-slate-900"
      )}
    >
      {input}
      <div>
        <p className="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-slate-100">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          Data uploaded
        </p>
        <p className="text-xs text-gray-500 dark:text-slate-400">
          {lastUploadedAt && <>Last uploaded {lastUploadedAt.toLocaleString()} · </>}
          {summary}
        </p>
      </div>
      <Button size="sm" onClick={open} disabled={props.disabled}>
        <Upload className="mr-1.5 h-4 w-4" />
        {props.disabled ? "Saving..." : "Upload new export"}
      </Button>
    </div>
  );
}
