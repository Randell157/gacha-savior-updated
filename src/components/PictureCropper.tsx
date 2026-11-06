"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** The saved picture's width and height. Sharp at the largest size shown (56 px) on any screen. */
const OUTPUT_SIZE = 256;
/** The fewest image pixels a crop can use, which sets how far the slider zooms. */
export const MIN_CROP_SIZE = 128;
/** On screen; fits inside the dialog on a 320 px phone. */
const FRAME = 260;
const KEY_STEP = 8;
/** Firestore rules refuse a larger picture; JPEG quality drops first if a busy image needs it. */
const MAX_STORED_LENGTH = 190_000;

export interface PictureSource {
  url: string;
  image: HTMLImageElement;
}

interface View {
  zoom: number;
  /** The image's top-left corner, in screen pixels from the frame's */
  x: number;
  y: number;
}

/** Keeps the frame covered, so the crop can't include empty space. */
function clamped(view: View, width: number, height: number): View {
  const scale = (FRAME / Math.min(width, height)) * view.zoom;
  return {
    zoom: view.zoom,
    x: Math.min(0, Math.max(FRAME - width * scale, view.x)),
    y: Math.min(0, Math.max(FRAME - height * scale, view.y)),
  };
}

function encode(image: HTMLImageElement, x: number, y: number, size: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas isn't available");
  context.imageSmoothingQuality = "high";
  // JPEG has no transparency, so a transparent PNG goes on white rather than black.
  context.fillStyle = "#fff";
  context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  context.drawImage(image, x, y, size, size, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  for (const quality of [0.85, 0.7, 0.5]) {
    const url = canvas.toDataURL("image/jpeg", quality);
    if (url.length <= MAX_STORED_LENGTH) return url;
  }
  throw new Error("The picture is too large to store");
}

/**
 * A fixed square that the image moves and zooms behind (drag, the arrow keys and
 * the slider). Everything happens in the browser; only the 256 px result is saved.
 */
export default function PictureCropper({
  source,
  onSave,
  onClose,
}: {
  source: PictureSource;
  /** Saves the picture, a JPEG data URL; rejects if it can't */
  onSave: (picture: string) => Promise<void>;
  onClose: () => void;
}) {
  const width = source.image.naturalWidth;
  const height = source.image.naturalHeight;
  const shortSide = Math.min(width, height);
  const maxZoom = Math.max(1, shortSide / MIN_CROP_SIZE);

  const [view, setView] = useState<View>(() => {
    const scale = FRAME / shortSide;
    return { zoom: 1, x: (FRAME - width * scale) / 2, y: (FRAME - height * scale) / 2 };
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const lastPointer = useRef<{ x: number; y: number } | null>(null);

  const scale = (FRAME / shortSide) * view.zoom;
  const cropSize = FRAME / scale;

  const move = (dx: number, dy: number) =>
    setView((v) => clamped({ ...v, x: v.x + dx, y: v.y + dy }, width, height));

  // Zooms around the frame's centre, so what you're looking at stays put.
  const zoomTo = (zoom: number) =>
    setView((v) => {
      const oldScale = (FRAME / shortSide) * v.zoom;
      const newScale = (FRAME / shortSide) * zoom;
      const centre = FRAME / 2;
      return clamped(
        {
          zoom,
          x: centre - ((centre - v.x) / oldScale) * newScale,
          y: centre - ((centre - v.y) / oldScale) * newScale,
        },
        width,
        height
      );
    });

  const save = async () => {
    setIsSaving(true);
    setError("");
    try {
      await onSave(encode(source.image, -view.x / scale, -view.y / scale, cropSize));
      onClose();
    } catch (error) {
      console.error("Saving picture failed:", error);
      setError("Couldn't save your picture. Check your connection and try again.");
      setIsSaving(false);
    }
  };

  const used = Math.round(cropSize);
  const percent = Math.round(((cropSize * cropSize) / (width * height)) * 100);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !isSaving) onClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Crop your picture</DialogTitle>
          <DialogDescription>Drag to position it. Use the slider to use less of the image.</DialogDescription>
        </DialogHeader>
        <div
          tabIndex={0}
          role="application"
          aria-label="Crop area. The arrow keys move the image."
          style={{ width: FRAME, height: FRAME }}
          className="relative mx-auto cursor-move touch-none select-none overflow-hidden rounded-md bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-slate-950"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            lastPointer.current = { x: e.clientX, y: e.clientY };
          }}
          onPointerMove={(e) => {
            if (!lastPointer.current) return;
            move(e.clientX - lastPointer.current.x, e.clientY - lastPointer.current.y);
            lastPointer.current = { x: e.clientX, y: e.clientY };
          }}
          onPointerUp={() => {
            lastPointer.current = null;
          }}
          onPointerCancel={() => {
            lastPointer.current = null;
          }}
          onKeyDown={(e) => {
            const step = {
              ArrowLeft: [KEY_STEP, 0],
              ArrowRight: [-KEY_STEP, 0],
              ArrowUp: [0, KEY_STEP],
              ArrowDown: [0, -KEY_STEP],
            }[e.key];
            if (step) {
              e.preventDefault();
              move(step[0], step[1]);
            }
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- a local file's object URL, shown at a changing size */}
          <img
            src={source.url}
            alt=""
            draggable={false}
            className="pointer-events-none absolute max-w-none"
            style={{ width: width * scale, height: height * scale, left: view.x, top: view.y }}
          />
          {/* How it looks as a round picture. */}
          <div className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_400px_rgba(0,0,0,0.35)]" />
          <div className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-inset ring-white" />
        </div>
        <label className="flex items-center gap-3 text-sm text-gray-600 dark:text-slate-400">
          Zoom
          <input
            type="range"
            min={1}
            max={maxZoom}
            step={0.01}
            value={view.zoom}
            disabled={maxZoom === 1}
            onChange={(e) => zoomTo(Number(e.target.value))}
            className="h-6 min-w-0 flex-1 accent-indigo-600 dark:accent-indigo-400"
          />
        </label>
        <p className="text-sm text-gray-600 dark:text-slate-400">
          Uses {used.toLocaleString()} × {used.toLocaleString()} px of your {width.toLocaleString()} ×{" "}
          {height.toLocaleString()} px image ({percent}%).
        </p>
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-300">
            {error}
          </p>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" disabled={isSaving} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={isSaving} onClick={save}>
            {isSaving ? "Saving..." : "Save picture"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
