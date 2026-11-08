# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Gacha Savior is a CS capstone project: a website where players track and organize their gacha game accounts. Genshin Impact is the only supported game so far. Honkai: Star Rail and Zenless Zone Zero are planned and appear as "Coming soon" in the game picker. The site is deployed on Vercel at https://gacha-savior-updated.vercel.app/ (Vercel project `gacha-savior-updated`, deployed from this folder with `npx vercel --prod`; the folder's `.vercel/` link is gitignored). Its environment variables are set in the Vercel dashboard: the `NEXT_PUBLIC_FIREBASE_*` values as Config, `FIREBASE_SERVICE_ACCOUNT_KEY` as Secret. The old site at https://gachasavior.vercel.app/ is a separate Vercel project still running the pre-Phase 0 code, linked to the old GitHub repo.

Stack: Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS 3, shadcn/ui (Radix + lucide-react icons), and Firebase (Auth + Firestore). The Firebase project is on the Spark (free) plan.

Planned work is in [docs/DESIGN.md](docs/DESIGN.md), organized into phases with a "Done when" check for each. Read the relevant phase before starting feature work. Who the site is for and what it's trying to be are in [PRODUCT.md](PRODUCT.md), written with the Impeccable design plugin (`/impeccable init`); keep it current when those facts change.

The project is local-only for now: there is no git remote. Don't push. A new GitHub repo will be created later.

## Keeping these docs current

Update this file (commands, rules) and `docs/ARCHITECTURE.md` (how the code works) in the same change whenever a change makes them wrong or incomplete: new routes, contexts or `src/lib` modules; changes to the data flow or Firestore model; new or fixed commands; new conventions. When a design phase is finished, move what it built from "planned" into `docs/ARCHITECTURE.md`, and mark the phase done in `docs/DESIGN.md`. Keep both describing how the code works today, not plans.

**Credits go in `README.md`, in the same change, without being asked.** Whenever a change brings in something made by someone else, add it to the README's "Credits" section under the matching heading (Game content, Account exports, or Libraries and tools): a new npm dependency the site or its scripts use, a data source, images or icons, fonts, or a file format or tool. Give the name, a link, the author where relevant, and the license, read from the package's own `package.json` or LICENSE rather than from memory. Game artwork, names and text are credited to HoYoverse. Also remove the credit when the thing is removed.

## Commands

```bash
npm run dev          # dev server at http://localhost:3000, using the real Firebase project
npm run emulators    # local Auth (9099) + Firestore (8080) emulators, UI at http://localhost:4000
npm run dev:emu      # dev server pointed at the emulators (start `npm run emulators` first)
npm run build        # production build
npm run lint         # eslint . (flat config in eslint.config.mjs)
npx tsc --noEmit     # type check
npm run test:e2e     # end-to-end tests on fresh emulators (stop the dev server and emulators first)
npm run data:genshin # regenerate src/data/genshin/*.json from genshin-db (after a game patch)
npm run icons:weapons # download icons for weapons that don't have one yet (after data:genshin)
npm run icons:artifacts # same for artifact pieces (each set's icon per slot)
npm run data:test-export # regenerate the made-up test export (after data:genshin or a new character)
npm run migrate:usernames [-- --apply]       # one-time username lowercase migration (live project; dry run by default)
npm run migrate:usernames:emu [-- --apply]   # same, against the emulator
npx firebase deploy --only firestore:rules   # publish firestore.rules (needs `npx firebase login`)
```

- **Use the emulators for anything that signs in or writes data.** They run under the demo project `demo-gachasavior`, which can't reach the real project. `dev:emu` uses `cross-env` to override `NEXT_PUBLIC_FIREBASE_PROJECT_ID` and set `NEXT_PUBLIC_USE_FIREBASE_EMULATORS`, `FIRESTORE_EMULATOR_HOST` and `FIREBASE_AUTH_EMULATOR_HOST`. In that mode `firebaseAdmin.ts` needs no service account. Emulator data is exported to `.emulator-data/` (gitignored) on exit and imported on the next start. To read emulator data directly, send REST requests with `Authorization: Bearer owner` to `http://127.0.0.1:8080/v1/projects/demo-gachasavior/databases/(default)/documents/...`.
- `.claude/launch.json` has `dev`, `emulators` and `dev:emu` configurations for previewing in the Claude desktop app, plus `start` (`npm run start`, the production build from `npm run build`, for the test build the user checks before every commit and deploy) and `mockups`, which serves the gitignored `.mockups/` folder (standalone HTML design mockups) on port 4100 with Python's `http.server`.
- `eslint.config.mjs` sets `settings.react.version` explicitly. Without it, `eslint-plugin-react` crashes under ESLint 10 while trying to auto-detect the version. The React Compiler lint rules are on, including `react-hooks/set-state-in-effect`: don't call `setState` synchronously in an effect body. Read external state with `useSyncExternalStore` or a lazy `useState` initializer, and set state from async callbacks.
- The playwright Claude Code plugin writes its snapshots, console logs and screenshots to `.playwright-mcp/` (gitignored). On the user's machine it runs as a local MCP server `playwright-chrome` (`npx @playwright/mcp@latest --browser chrome --headless`, added with `claude mcp add --scope local`), and the plugin's own windowed copy is turned off for this folder in `.claude/settings.local.json`. Playwright's Firefox builds don't start on that PC (Windows reports a missing `mozglue` side-by-side assembly), so stay on Chrome or Edge.
- **End-to-end tests** (Playwright, in `e2e/`): `npm run test:e2e` starts its own empty emulators and dev server on port 3100, so stop any dev server and the emulators first. **Run the tests only when the user asks** (a full run costs a lot of tokens); still update the specs when features change, and when copy changes on purpose, update the text the tests expect. How the setup, helpers and specs work is in the "End-to-end tests" section of `docs/ARCHITECTURE.md`.
- Don't read the generated files in `src/data/genshin/` whole: `characterExtras.json` (~480 KB) and `weaponDetails.json` (~210 KB) would cost over 100,000 tokens. Look up only the entries needed with a short `node -e` query, or use the helpers in `src/lib/genshin/`.
- `.claude/settings.local.json` turns off the `firebase`, `vercel`, `example-skills` and `plugin-dev` plugins for this folder, to save tokens. Deploy with `npx vercel --prod`, and publish rules with the Firebase CLI or the console.
- Copy `.env.example` to `.env.local` for the Firebase config. `src/lib/firebase.ts` throws at startup if any value is missing.
- `npm audit` still reports issues that are known and accepted (checked 2026-11-01, Next 16.4.3). Moderate ones are in the ESLint toolchain, which is dev-only, and npm's suggested "fixes" would downgrade to years-old versions. High ones come from `@grpc/grpc-js` ~1.9 bundled with the `firebase` client; even the latest Firebase (13.1.0) still uses it, and the advisories concern gRPC servers and Node usage. Don't run `npm audit fix --force`.
- On Windows, stop the dev server before running `npm install`. Files the server holds open can make npm silently skip packages; this once left out `@opentelemetry/api`, which `firebase-admin` needs, and the server crashed when the route loaded.

## Architecture

The details are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). **Before changing code, read the section for that area**, not the whole file (`grep -n '^### ' docs/ARCHITECTURE.md` lists them):

- **Data flow:** uploads, parsing, Firestore storage, `useGenshinData`, remembered filters.
- **Protected pages:** `RequireAuth`, signed-out views, skeletons, the quick view.
- **Auth and Firestore:** collections, security rules, login, passwords, account routes, the Admin SDK, profile pictures.
- **Games:** the hub, each game's section and tabs, adding a game.
- **Character names and portraits:** the roster, game data and how to update it after a patch, stat and name helpers, and the Genshin pages (features and sample, weapons and each weapon's page, artifacts and Crit Value, character page), shared components, icons.
- **UI conventions:** read before any UI change: page shells, titles, accessibility, motion, header, copy, dark mode.
- **End-to-end tests:** the Playwright setup, helpers, specs, and checking the parser by hand.

Rules for every change:

- Data pages are `"use client"` and read data only through `useGenshinData()`. Import types from `src/lib/genshin/types.ts`. Never show a raw GOOD key; use the helpers (`formatStatName`, `weaponName`, `artifactSetName`, `materialName`).
- Keep the current look; redesigns need the user's approval. Every page uses `PageShell` (or `CenteredPage` / `PageFrame`), and a new route gets a `layout.tsx` with its title.
- Every hard-coded colour class has a `dark:` partner. Small text is at least `text-gray-500 dark:text-slate-400`. Controls without visible text get an `aria-label`.
- Copy: sentence case, "Log in" as two words, American spelling, "owned" not "obtained".
- Use the shadcn components and the `@/*` import alias. Keep full-inventory views paged.
