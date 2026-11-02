import { cn } from "@/lib/utils";

/** The "GS" monogram. The favicon (src/app/icon.svg) is the same mark. */
export default function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-6 w-6 shrink-0", className)}
      aria-hidden
    >
      <rect width="32" height="32" rx="8" fill="#4f46e5" />
      <text
        x="16"
        y="21.5"
        textAnchor="middle"
        fontWeight="700"
        fontSize="14"
        fill="#ffffff"
        style={{ fontFamily: "inherit" }}
      >
        GS
      </text>
    </svg>
  );
}
