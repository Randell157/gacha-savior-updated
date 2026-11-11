"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Segmented from "@/components/Segmented";
import { monthlyCounts, type Pull, type WishPool } from "@/lib/genshin/wishes";
import { cn } from "@/lib/utils";

// "Wishes per month" on the Wishes page (option C from .mockups/wish-chart.html):
// columns for the banner chosen above, with a gold dot on months that brought
// a 5★. Colors were run through the dataviz validator against white and
// slate-900: indigo-600 / indigo-500 columns, an amber-600 dot in both modes.
// Months with a 5★ are buttons that find it in the 5★ history above (option A
// from .mockups/chart-click.html); WishStats does the finding.

type Range = "12" | "24" | "all";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthName = (month: string) => `${MONTHS[Number(month.slice(5)) - 1]} ${month.slice(0, 4)}`;
const n = (value: number) => value.toLocaleString("en-US");
/** A round top for the axis: the first of these at or above the busiest month. */
const niceMax = (v: number) =>
  [10, 20, 25, 50, 100, 150, 200, 250, 300, 400, 500, 600, 800, 1000].find((s) => s >= v) ?? Math.ceil(v / 500) * 500;

type Props = {
  pulls: Pull[];
  pool: WishPool;
  label: string;
  /** The month ("2026-06") last pressed, tinted until something else is chosen. */
  picked?: string | null;
  /** Called when a month with a 5★ is pressed, to find it in the 5★ history. */
  onPickMonth?: (month: string) => void;
};

export default function WishesPerMonth({ pulls, pool, label, picked = null, onPickMonth }: Props) {
  const [range, setRange] = useState<Range>("24");
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const all = useMemo(() => monthlyCounts(pulls, pool), [pulls, pool]);
  const months = range === "all" ? all : all.slice(-Number(range));
  const total = months.reduce((sum, m) => sum + m.wishes, 0);
  const rangeLabel = range === "12" ? "Last 12 months" : range === "24" ? "Last 2 years" : "All time";

  if (!all.length) return null;

  // Geometry (dataviz mark specs: columns at most 24 px with 4 px rounded tops, hairline grid).
  const height = width < 640 ? 180 : 220;
  const left = 36, right = 4, top = 14, bottom = 24;
  const innerW = Math.max(0, width - left - right), innerH = height - top - bottom;
  const max = niceMax(Math.max(1, ...months.map((m) => m.wishes)));
  const band = months.length ? innerW / months.length : 0;
  const barW = Math.max(2, Math.min(24, band * 0.7));
  const radius = Math.min(4, barW / 2);
  const y = (v: number) => top + innerH - (v / max) * innerH;
  // Label every Nth calendar month, N the smallest that leaves room for the label.
  const every = [1, 2, 3, 6, 12].find((k) => band * k >= (months.length <= 12 ? 30 : 44)) ?? 12;
  const shown = hover === null ? null : months[hover];

  return (
    <section aria-labelledby="wishes-per-month" className="mt-8">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div>
          <h2 id="wishes-per-month" className="text-lg font-semibold text-indigo-900 dark:text-indigo-200">
            Wishes per month
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            {rangeLabel} · {n(total)} wishes on {label}
          </p>
        </div>
        <Segmented
          label="Time range"
          value={range}
          onChange={(value) => {
            setRange(value);
            setHover(null);
          }}
          options={[
            { value: "12", label: "12 months" },
            { value: "24", label: "2 years" },
            { value: "all", label: "All" },
          ]}
        />
      </div>
      <div className="mb-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-slate-400" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-[3px] bg-indigo-600 dark:bg-indigo-500" />
          {label} wishes
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-600" />A month with a 5★
        </span>
      </div>

      <div ref={box} className="relative" onMouseLeave={() => setHover(null)}>
        {width > 0 && (
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="block overflow-visible"
            role="group"
            aria-label={`Wishes per month on ${label}, ${rangeLabel.toLowerCase()}: ${n(total)} wishes. Each month is listed below the chart too.`}
          >
            {[0, max / 2, max].map((t) => (
              <g key={t}>
                <line
                  x1={left}
                  x2={width - right}
                  y1={y(t)}
                  y2={y(t)}
                  strokeWidth={1}
                  className={t === 0 ? "stroke-gray-300 dark:stroke-slate-700" : "stroke-gray-100 dark:stroke-slate-800"}
                />
                <text x={left - 6} y={y(t) + 4} textAnchor="end" className="fill-gray-500 text-[11px] dark:fill-slate-400">
                  {n(t)}
                </text>
              </g>
            ))}
            {months.map((m, i) => {
              const cx = left + band * i + band / 2;
              const x = cx - barW / 2;
              const mon = Number(m.month.slice(5));
              const h = y(0) - y(m.wishes);
              const r = Math.min(radius, h);
              const pressable = !!onPickMonth && m.fiveStars.length > 0;
              const pick = () => onPickMonth?.(m.month);
              return (
                <g key={m.month}>
                  {picked === m.month && (
                    <rect x={left + band * i} y={top} width={band} height={innerH} rx={4} className="fill-indigo-500/15" />
                  )}
                  {(mon - 1) % every === 0 && cx - left >= 14 && (
                    <text x={cx} y={height - 6} textAnchor="middle" className="fill-gray-500 text-[11px] dark:fill-slate-400">
                      {every === 12 ? m.month.slice(0, 4) : months.length <= 12 ? MONTHS[mon - 1] : `${MONTHS[mon - 1]} ${m.month.slice(2, 4)}`}
                    </text>
                  )}
                  {h > 0 && (
                    <path
                      d={`M${x},${y(0)} V${y(m.wishes) + r} Q${x},${y(m.wishes)} ${x + r},${y(m.wishes)} H${x + barW - r} Q${x + barW},${y(m.wishes)} ${x + barW},${y(m.wishes) + r} V${y(0)} Z`}
                      className="fill-indigo-600 dark:fill-indigo-500"
                    />
                  )}
                  {m.fiveStars.length > 0 && (
                    <circle
                      cx={cx}
                      cy={y(m.wishes) - 9}
                      r={4.5}
                      strokeWidth={2}
                      className="fill-amber-600 stroke-white dark:stroke-slate-900"
                    />
                  )}
                  <rect
                    x={left + band * i}
                    y={top}
                    width={band}
                    height={innerH}
                    fill="transparent"
                    tabIndex={0}
                    role={pressable ? "button" : "img"}
                    aria-label={`${monthName(m.month)}: ${n(m.wishes)} wishes${m.fiveStars.length ? `, 5★: ${m.fiveStars.join(", ")}` : ""}${pressable ? ". Show in the history" : ""}`}
                    className={cn("outline-none focus-visible:fill-indigo-500/10", pressable && "cursor-pointer")}
                    onClick={pressable ? pick : undefined}
                    onKeyDown={
                      pressable
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              pick();
                            }
                          }
                        : undefined
                    }
                    onMouseEnter={() => setHover(i)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                  />
                </g>
              );
            })}
          </svg>
        )}
        {shown && hover !== null && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-1.5 z-10 min-w-[9rem] -translate-y-full rounded-lg bg-gray-900 px-2.5 py-2 text-xs text-white shadow-lg dark:bg-slate-100 dark:text-slate-900"
            style={{ left: Math.min(Math.max(0, left + band * hover + band / 2 - 72), Math.max(0, width - 160)) }}
          >
            <p className="text-[13px] font-semibold">{monthName(shown.month)}</p>
            <p className="flex justify-between gap-3">
              <span>Wishes</span>
              <span>{n(shown.wishes)}</span>
            </p>
            {shown.fiveStars.length > 0 && <p className="mt-1">5★: {shown.fiveStars.join(", ")}</p>}
          </div>
        )}
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer font-medium text-indigo-600 dark:text-indigo-400">Show as a table</summary>
        <div
          className="mt-2 max-h-64 overflow-auto rounded-lg border dark:border-slate-700"
          tabIndex={0}
          role="region"
          aria-label="Wishes per month table"
        >
          <table className="w-full border-collapse tabular-nums">
            <thead>
              <tr className="sticky top-0 bg-white dark:bg-slate-900">
                <th className="border-b px-3 py-1.5 text-left font-semibold dark:border-slate-700">Month</th>
                <th className="border-b px-3 py-1.5 text-right font-semibold dark:border-slate-700">{label}</th>
                <th className="border-b px-3 py-1.5 text-left font-semibold dark:border-slate-700">5★</th>
              </tr>
            </thead>
            <tbody>
              {[...months].reverse().map((m) => (
                <tr key={m.month}>
                  <td className="whitespace-nowrap border-b px-3 py-1 dark:border-slate-700">{monthName(m.month)}</td>
                  <td className="border-b px-3 py-1 text-right dark:border-slate-700">{n(m.wishes)}</td>
                  <td className="border-b px-3 py-1 text-gray-600 dark:border-slate-700 dark:text-slate-400">
                    {m.fiveStars.join(", ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
