# Review rubric

Before a phase step is reported as finished, a fresh subagent reviews it. That subagent hasn't seen the coding conversation. Small fixes and copy changes skip this.

## How the review runs

1. **Start the reviewer** with the Agent tool. Give it only:
   - the step's text from `docs/DESIGN.md`, including its boxes;
   - the changed files (`git diff` plus any new untracked files);
   - this file.

   It reads the code and runs the cheap checks itself. It doesn't need the app running.
2. **It answers in two parts:**
   - every rubric line below with pass, fail or n/a, each with its evidence (a command's output, or a file and line);
   - a short list of bugs, missed cases and rule breaks. It looks for what's wrong, not for reasons the change is fine.
3. **Fix and re-review, up to 3 rounds.** For each fail, either fix it and re-run the checks, or explain in the report why it was intended. The reviewer can't see why a choice was made, so don't "fix" a deliberate choice just to pass. If something still fails after the third round, stop and tell the user what's failing and why.
4. **Report to the user** the step's boxes with their evidence, as usual, plus the reviewer's verdict and how many rounds it took.

The reviewer never runs `npm run test:e2e`, since e2e runs are user-approved only. The coding agent still does the visual checks (light, dark, phone width) on the emulators, because a reviewer would have to run the app to see them.

## Rubric

**Checks**
- `npm run lint`, `npx tsc --noEmit` and `npm test` pass.
- New or changed logic in a tested module has new test cases.
- Tested modules import with `.ts` and use no `@/` imports.

**Code rules**
- Data pages are `"use client"` and read data only through `useGenshinData()`.
- Types come from `src/lib/genshin/types.ts`.
- No raw GOOD key is shown; the helpers are used (`formatStatName`, `weaponName`, `artifactSetName`, `materialName`).
- No `setState` is called synchronously in an effect body.
- shadcn components and the `@/*` alias are used.
- Full-inventory views are paged.
- A new route has a `layout.tsx` with its title, and the page uses `PageShell`, `CenteredPage` or `PageFrame`.

**Scope and look**
- The change matches the step and `PRODUCT.md`, and adds nothing beyond them (not a damage calculator).
- The current look is kept. A UI change has a mockup the user approved, recorded in the step in `docs/DESIGN.md`.
- It stays on the Spark plan: no new paid services or Firebase products. Any new Firestore query has a limit, and the per-user document stays well under 1 MiB.

**UI and copy (from the code)**
- Every hard-coded colour class has a `dark:` partner.
- Small text is at least `text-gray-500 dark:text-slate-400`.
- Controls without visible text have an `aria-label`.
- Copy uses sentence case, "Log in" as two words, American spelling, and "owned", not "obtained".
- The e2e specs are updated for changed features and copy.

**Docs**
- `CLAUDE.md` and `docs/ARCHITECTURE.md` are updated where the change makes them wrong or incomplete.
- The README credits cover anything new from someone else.
- A release change also updates the README version line and, for minor and major versions, the About timeline.
- Each ticked box in the step has its evidence.
