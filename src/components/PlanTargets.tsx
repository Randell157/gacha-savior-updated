"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CharacterTarget } from "@/lib/genshin/materialPlanner";

/** The levels worth aiming for: where you are, then each level cap above it. */
function levelChoices(current: number, max: number): number[] {
  const caps = [20, 40, 50, 60, 70, 80, 90].filter((cap) => cap > current && cap <= max);
  return [current, ...caps];
}

const LABEL = "mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-slate-400";

export function LevelTarget({
  id,
  current,
  value,
  max = 90,
  onChange,
}: {
  id: string;
  current: number;
  value: number;
  max?: number;
  onChange: (level: number) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className={LABEL}>
        Level
      </label>
      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-gray-500 dark:text-slate-400">
          {current} <span aria-hidden="true">→</span>
          <span className="sr-only">now, target</span>
        </span>
        <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
          <SelectTrigger id={id} className="h-8 w-[4.5rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {levelChoices(current, max).map((level) => (
              <SelectItem key={level} value={String(level)}>
                {level}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function TalentStepper({
  label,
  current,
  value,
  onChange,
}: {
  label: string;
  current: number;
  value: number;
  onChange: (level: number) => void;
}) {
  return (
    <div>
      <span className={LABEL}>{label}</span>
      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-gray-500 dark:text-slate-400">
          {current} <span aria-hidden="true">→</span>
        </span>
        <div role="group" aria-label={`${label} target, now ${current}`} className="inline-flex items-center rounded-md border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <button
            type="button"
            aria-label={`Lower ${label} target`}
            disabled={value <= current}
            onClick={() => onChange(value - 1)}
            className="h-8 w-7 rounded-l-md text-gray-700 hover:bg-indigo-50 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-indigo-900/40"
          >
            −
          </button>
          <output aria-live="polite" className="min-w-[2rem] border-x border-gray-200 text-center font-semibold tabular-nums leading-8 dark:border-slate-700">
            {value}
          </output>
          <button
            type="button"
            aria-label={`Raise ${label} target`}
            disabled={value >= 10}
            onClick={() => onChange(value + 1)}
            className="h-8 w-7 rounded-r-md text-gray-700 hover:bg-indigo-50 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-indigo-900/40"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

/** Target level and talent levels for a character, starting from where they are. */
export function CharacterTargets({
  idPrefix,
  now,
  value,
  onChange,
}: {
  idPrefix: string;
  now: CharacterTarget;
  value: CharacterTarget;
  onChange: (target: CharacterTarget) => void;
}) {
  const talent = (part: keyof CharacterTarget["talent"]) => (level: number) =>
    onChange({ ...value, talent: { ...value.talent, [part]: level } });
  const atMax = value.level === 90 && value.talent.auto === 10 && value.talent.skill === 10 && value.talent.burst === 10;
  return (
    <div className="flex flex-wrap items-end gap-x-5 gap-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
      <LevelTarget id={`${idPrefix}-level`} current={now.level} value={value.level} onChange={(level) => onChange({ ...value, level })} />
      <TalentStepper label="Normal Attack" current={now.talent.auto} value={value.talent.auto} onChange={talent("auto")} />
      <TalentStepper label="Skill" current={now.talent.skill} value={value.talent.skill} onChange={talent("skill")} />
      <TalentStepper label="Burst" current={now.talent.burst} value={value.talent.burst} onChange={talent("burst")} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={atMax}
        onClick={() => onChange({ level: 90, talent: { auto: 10, skill: 10, burst: 10 } })}
      >
        All to max
      </Button>
    </div>
  );
}
