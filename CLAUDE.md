# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Gacha Savior is a CS capstone project: a website where players track and organize their gacha game accounts. Genshin Impact is the only supported game so far. Honkai: Star Rail and Zenless Zone Zero are planned and appear as "Coming soon" in the game picker. The site is deployed on Vercel at https://gacha-savior-updated.vercel.app/ (Vercel project `gacha-savior-updated`, deployed from this folder with `npx vercel --prod`; the folder's `.vercel/` link is gitignored). Its environment variables are set in the Vercel dashboard: the `NEXT_PUBLIC_FIREBASE_*` values as Config, `FIREBASE_SERVICE_ACCOUNT_KEY` as Secret. The old site at https://gachasavior.vercel.app/ is a separate Vercel project still running the pre-Phase 0 code, linked to the old GitHub repo.

Stack: Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS 3, shadcn/ui (Radix + lucide-react icons), and Firebase (Auth + Firestore). The Firebase project is on the Spark (free) plan.

Planned work is in [docs/DESIGN.md](docs/DESIGN.md), organized into phases with a "Done when" check for each. Read the relevant phase before starting feature work.

The project is local-only for now: there is no git remote. Don't push. A new GitHub repo will be created later.

## Keeping this file current

Update this file in the same change whenever a change makes it wrong or incomplete: new routes, contexts or `src/lib` modules; changes to the data flow or Firestore model; new or fixed commands; new conventions. When a design phase is finished, move what it built from "planned" into the Architecture section here, and mark the phase done in `docs/DESIGN.md`. Keep this file describing how the code works today, not plans.

## Commands

```bash
npm run dev          # dev server at http://localhost:3000, using the real Firebase project
npm run emulators    # local Auth (9099) + Firestore (8080) emulators, UI at http://localhost:4000
npm run dev:emu      # dev server pointed at the emulators (start `npm run emulators` first)
npm run build        # production build
npm run lint         # eslint . (flat config in eslint.config.mjs)
npx tsc --noEmit     # type check
npm run migrate:usernames [-- --apply]       # one-time username lowercase migration (live project; dry run by default)
npm run migrate:usernames:emu [-- --apply]   # same, against the emulator
npx firebase deploy --only firestore:rules   # publish firestore.rules (needs `npx firebase login`)
```

- **Use the emulators for anything that signs in or writes data.** They run under the demo project `demo-gachasavior`, which can't reach the real project. `dev:emu` uses `cross-env` to override `NEXT_PUBLIC_FIREBASE_PROJECT_ID` and set `NEXT_PUBLIC_USE_FIREBASE_EMULATORS`, `FIRESTORE_EMULATOR_HOST` and `FIREBASE_AUTH_EMULATOR_HOST`. In that mode `firebaseAdmin.ts` needs no service account. Emulator data is exported to `.emulator-data/` (gitignored) on exit and imported on the next start. To read emulator data directly, send REST requests with `Authorization: Bearer owner` to `http://127.0.0.1:8080/v1/projects/demo-gachasavior/databases/(default)/documents/...`.
- `.claude/launch.json` has `dev`, `emulators` and `dev:emu` configurations for previewing in the Claude desktop app.
- `eslint.config.mjs` sets `settings.react.version` explicitly. Without it, `eslint-plugin-react` crashes under ESLint 10 while trying to auto-detect the version. The React Compiler lint rules are on, including `react-hooks/set-state-in-effect`: don't call `setState` synchronously in an effect body. Read external state with `useSyncExternalStore` or a lazy `useState` initializer, and set state from async callbacks.
- **There are no tests** and no test framework. To check the parser by hand, Node 24 can import the `.ts` file directly: `node --input-type=module -e 'import { parseGoodText } from "./src/lib/genshin/parseGood.ts"; ...'`.
- Copy `.env.example` to `.env.local` for the Firebase config. `src/lib/firebase.ts` throws at startup if any value is missing.
- `npm audit` still reports issues that are known and accepted (checked 2026-11-01, Next 16.4.3). Moderate ones are in the ESLint toolchain, which is dev-only, and npm's suggested "fixes" would downgrade to years-old versions. High ones come from `@grpc/grpc-js` ~1.9 bundled with the `firebase` client; even the latest Firebase (13.1.0) still uses it, and the advisories concern gRPC servers and Node usage. Don't run `npm audit fix --force`.
- On Windows, stop the dev server before running `npm install`. Files the server holds open can make npm silently skip packages; this once left out `@opentelemetry/api`, which `firebase-admin` needs, and the server crashed when the route loaded.

## Architecture

### Data flow: uploads are parsed in the browser and stored in Firestore

Every data page is a `"use client"` component. The only server code is the username lookup route (see Auth below).

1. The user exports their account as a **GOOD format** JSON file using **Inventory Kamera** or **Irminsul**. Sample exports are in `public/sample-data/inventory-kamera/`: `genshin_export_2026-02-11_12-16.json` (Irminsul, GOOD v3, 1,717 artifacts) and `genshinData_GOOD_2024_10_28_01_22.json` (Inventory Kamera, GOOD v2). The site serves them as static files, which is handy for test uploads.
2. The dashboard (`src/app/dashboard/page.tsx`) reads the file and runs **`parseGoodText` / `parseGood`** (`src/lib/genshin/parseGood.ts`). The parser requires `format: "GOOD"`, drops invalid entries and unused fields (returning warnings, which the dashboard shows), turns empty `location` strings into `undefined`, and returns a normalized `GenshinData` in which every list is always present.
3. **`src/lib/genshin/firestoreStore.ts`** saves and loads the upload:
   - `users/{uid}/games/genshin` holds `format`, `version`, `source`, `uploadedAt`, `counts`, `artifactChunkCount`, `characters`, `weapons`, `materials` and `showcase` (5 character keys or null).
   - `users/{uid}/games/genshin/artifactChunks/{0..n}` holds `{ items: GoodArtifact[] }`, up to 400 per chunk, because a large export goes past the 1 MiB document limit.
   - `saveGenshin` writes everything in a single `writeBatch` and deletes chunks left over from a bigger earlier upload. `loadGenshin` reads the main document and its chunks, then runs the result back through `parseGood`.
   - Firestore is initialized with `ignoreUndefinedProperties: true`, because the parsed data uses `undefined` for missing optional fields.
4. **`GenshinDataProvider`** (`src/contexts/GenshinDataContext.tsx`) loads the data once per login and shares it with every page. **`useGenshinData()`** (`src/hooks/useGenshinData.ts`) is the only way pages read or write it, and returns `{ data, showcase, setShowcase, loading, loadError, lastUploadedAt, migratedFromLocal, save }`. `save` is async. `setShowcase` updates the screen first and undoes the change if the write fails.
5. **Moving data from localStorage:** before Phase 1, uploads lived in `localStorage["genshinData_<uid>"]` (with `genshinShowcase_<uid>`). On login, if the user has no Firestore document and those keys exist, the provider uploads them, deletes the keys, and the dashboard shows a "moved to your account" notice.
6. The types live in **`src/lib/genshin/types.ts`** (`GenshinData`, `GoodCharacter`, `GoodWeapon`, `GoodArtifact`, `GoodSubstat`). Import them from there rather than declaring local interfaces.
7. Equipped items are linked to a character by `weapon.location` / `artifact.location` matching `character.key`, not by being nested inside the character. Use **`buildEquipmentIndex(data)`** (`src/lib/genshin/equipment.ts`) to get each character's weapon and artifacts.

The only other localStorage key is `gachasavior-selected-game`, the selected game (`GameContext`, through `useSyncExternalStore`).

### Protected pages

`src/components/RequireAuth.tsx` wraps the dashboard, `/profile`, `/weapons`, `/artifacts` and `/characters/[key]`. It shows a "Loading your data..." screen (`LoadingPage`, also exported for `/characters`) until auth and `useGenshinData()` are both ready, and sends signed-out visitors to `/login` with `router.replace`. Inside it, pages can assume `loading` is false. The pattern is `export default function Page() { return <RequireAuth><Content /></RequireAuth>; }`. The `/characters` roster stays public; signed out, every character shows as unowned.

### Auth and Firestore

- `src/lib/firebase.ts` initializes the app from the `NEXT_PUBLIC_FIREBASE_*` environment variables (`.env.local` locally, the Vercel project settings when deployed), sets `browserLocalPersistence`, connects to the emulators when `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true`, and exports `app`, `db` and `auth`. Each variable must be read as a literal `process.env.NEXT_PUBLIC_...` so Next.js can inline it.
- Collections:
  - `users/{uid}`: `{ username, email, createdAt }`. `username` is kept as typed, for display.
  - `users/{uid}/games/genshin/...`: see Data flow.
  - `usernames/{lowercased name}`: `{ uid }`, which lets people log in with a username.
- **Security rules live in `firestore.rules`**, and `firebase.json` points the CLI and emulator at it:
  - `users/{uid}` and everything under it: only the owner can read or write.
  - `usernames`: signed-in users can read; anyone signed in can *create* `{ uid: <own uid> }` only, under a lowercase document ID; nothing can update or delete.
  - Everything else is denied.
  - Test rule changes on the emulator before deploying. The live project only picks up changes once they're deployed. The current file, including the lowercase-ID check, was published on 2026-11-02. The Firebase CLI isn't logged in with an account that can access the project, so publish by pasting the file into the console's Rules tab, or have the user log the CLI in as the project owner first.
- **Username login:** `login/page.tsx` treats any identifier without an `@` as a username and POSTs it to **`/api/auth/resolve-username`** (`src/app/api/auth/resolve-username/route.ts`). The route looks up `usernames/{name.toLowerCase()}`, then `users/{uid}`, using the Admin SDK, and returns `{ email }`. Any failure returns the same 401 "Invalid username or password." Requests are rate-limited in memory to 10 per minute per IP, counted separately on each server instance. The page then signs in with `signInWithEmailAndPassword`.
- `src/lib/firebaseAdmin.ts` (guarded by `import "server-only"`) initializes `firebase-admin` from `FIREBASE_SERVICE_ACCOUNT_KEY`, which is the service account JSON **base64-encoded** onto one line. In emulator mode it uses no key. It exports `adminDb`, which bypasses security rules, so use it only in API routes and scripts. The downloaded key file (`*-firebase-adminsdk-*.json`) is gitignored. Never print it or the env value.
- **Sign-up** creates the auth user, then claims `usernames/{lowercased name}` and writes `users/{uid}` in a single `runTransaction`. The transaction fails if the name is taken, matching "Zach" against "zach"; in that case the new auth user is deleted. Usernames can't be empty or contain `/` (it isn't allowed in a document ID) or `@` (login would treat the name as an email).
- **`scripts/migrate-usernames.mjs`** renames older `usernames` documents that have capital letters to lowercase. Names that would collide between different accounts are listed and left unchanged. It does a dry run unless given `--apply`, and is safe to run again. It was run on the live project on 2026-11-01, and every `usernames` document is now lowercase. The one conflict (`Randell`, a test account) was resolved by deleting its username document; that account logs in by email.
- `AuthContext` (`useAuth()`) provides `{ user, username, createdAt, loading, error }` (`createdAt` is the ISO string from `users/{uid}`, shown on `/profile`). It listens to `users/{uid}` with `onSnapshot`, so the name appears even though sign-up writes the profile just after the account is created.

### Providers and the multi-game scaffold

`src/app/layout.tsx` wraps the app as `GameProvider > AuthProvider > GenshinDataProvider`. `GameContext` (`useGame()`, with `GameId = "genshin" | "hsr" | "zzz"` and the `GAMES` list) is currently used only by the game-picker drawer in `header.tsx`. No page changes based on the selected game yet. The Firestore model keeps each game's data under `users/{uid}/games/{gameId}`, ready for more games.

### Character names and portraits

- `src/lib/genshinCharacters.ts` has `GENSHIN_CHARACTERS`, the full playable roster with portrait filenames. The `/characters` page shows the whole roster, with owned characters (from the upload) marked against unowned ones. Matching uses `normalizeCharacterKey` (lowercase, removes spaces, `_`, `'` and `-`). Any Traveler variant maps to the `traveler` entry.
- Portraits are `public/character-portraits/<Name>_Icon.png`, taken from the Genshin fandom wiki. **When a new character is released:** add the PNG, add an entry to `GENSHIN_CHARACTERS`, and if the name is two words, add it to `CHARACTER_DISPLAY_NAMES` in `src/lib/utils.ts`.
- `src/lib/genshin/stats.ts` turns GOOD stat and slot keys into readable text: `formatStatName` ("critDMG_" → "CRIT DMG", "hp_" → "HP%"), `formatStat` (name plus value, with "%" for percentage stats) and `formatSlotName` ("sands" → "Sands of Eon"). Never show a raw GOOD key on a page.
- `src/lib/utils.ts` holds `cn()` and the display-name helpers. `formatKeyWithSpaces` turns PascalCase GOOD keys into spaced words. `formatCharacterIconFilename` turns a GOOD key into its portrait filename.
- **The dashboard preview on `/features`** renders the real dashboard component (`src/components/Genshin.tsx`) with a made-up account from `src/lib/genshin/sampleData.ts` (`SAMPLE_GENSHIN_DATA`, `SAMPLE_SHOWCASE`), so it always matches the dashboard. Its `preview` prop points the "View All" buttons at `/create-account` and turns off the showcase portrait links. The showcase there is local state and isn't saved.
- `public/weapon-icons/` and `public/artifact-icons/` are empty, so those images fall back to `/placeholder.svg` through `onError`. Images using `fill` set `sizes` to their displayed size.

### UI conventions

The user wants to keep the current look. New pages and features should match it closely, and redesigns need the user's approval first. The full style guidance is in the "UI style" section of `docs/DESIGN.md`.

- **Every page uses `src/components/PageShell.tsx`** rather than placing `<Header />` and `<Footer />` itself:
  - `<PageShell title actions? panel?>`: header, the indigo-to-purple gradient, the white title bar (`actions` sit next to the title, as the sort and filter dropdowns do on `/characters`), the content panel, and footer. `panel` is `"padded"` (default), `"flush"` (no padding, for row layouts) or `"none"` (the page draws its own panels, like `/features`).
  - `<CenteredPage>`: the same frame with content centred, used by login, create-account, the 404 page and the loading screen.
  - `src/components/DetailRows.tsx` (`DetailRows`, `DetailRow`): the label/value rows on About, Contact and Profile.
- **Buttons are indigo.** The shadcn `Button` default variant is `bg-indigo-600 hover:bg-indigo-700` (edited in `src/components/ui/button.tsx`), so pages don't set button colours themselves. Use the shadcn `Input` and `Select` rather than native elements.
- **Header** (`src/components/header.tsx`): Features, About and Contact sit in the top bar from the `sm` breakpoint up; on phones they move into the ☰ side menu above the game list. The account menu has Profile and Logout. While auth loads, a grey placeholder shows instead of a "Login" link.
- `src/components/ui/` holds generated shadcn/ui components (style "default", base color slate, CSS variables). Add new ones with the shadcn CLI rather than writing them by hand.
- Use the `@/*` import alias for `./src/*`.
- ESLint settings: unused variables are allowed if prefixed with `_`, and `any` is allowed.
