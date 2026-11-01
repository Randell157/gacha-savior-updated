# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Gacha Savior is a CS capstone project: a website where players track and organize their gacha game accounts. Genshin Impact is the only supported game so far. Honkai: Star Rail and Zenless Zone Zero are planned and appear as "Coming soon" in the game picker. The site is deployed on Vercel at https://gachasavior.vercel.app/.

Stack: Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS 3, shadcn/ui (Radix + lucide-react icons), and Firebase (Auth + Firestore).

Planned work is in [docs/DESIGN.md](docs/DESIGN.md), organized into phases with a "Done when" check for each. Read the relevant phase before starting feature work.

The project is local-only for now: there is no git remote. Don't push. A new GitHub repo will be created later.

## Keeping this file current

Update this file in the same change whenever a change makes it wrong or incomplete: new routes, contexts or `src/lib` modules; changes to the data flow or Firestore model; new or fixed commands (for example once lint works again); new conventions. When a design phase is finished, move what it built from "planned" into the Architecture section here, and mark the phase done in `docs/DESIGN.md`. Keep this file describing how the code works today, not plans.

## Commands

```bash
npm run dev        # dev server at http://localhost:3000
npm run build      # production build
npm run lint       # eslint . (flat config in eslint.config.mjs)
npx tsc --noEmit   # type check
```

- `eslint.config.mjs` sets `settings.react.version` explicitly. Without it, `eslint-plugin-react` crashes under ESLint 10 while trying to auto-detect the version. The React Compiler lint rules are on, including `react-hooks/set-state-in-effect`: read external state such as localStorage with `useSyncExternalStore` or a lazy `useState` initializer, not with `setState` inside `useEffect`.
- **There are no tests** and no test framework. To check the parser by hand, Node 24 can import the `.ts` file directly: `node --input-type=module -e 'import { parseGoodText } from "./src/lib/genshin/parseGood.ts"; ...'`.
- Copy `.env.example` to `.env.local` for the Firebase config. `src/lib/firebase.ts` throws at startup if any value is missing.
- On Windows, stop the dev server before running `npm install`. Files the server holds open can make npm silently skip packages; this once left out `@opentelemetry/api`, which `firebase-admin` needs, and the server crashed when the route loaded.

## Architecture

### Data flow: everything is client-side, and the user's game data lives in localStorage

Every data page is a `"use client"` component. The only server code is the username lookup route (see Auth below).

1. The user exports their account as a **GOOD format** JSON file using **Inventory Kamera** or **Irminsul**. Sample exports are in `public/sample-data/inventory-kamera/` (Irminsul, GOOD v3) and `src/public/` (Inventory Kamera, GOOD v2).
2. The dashboard (`src/app/dashboard/page.tsx`) reads the file and runs **`parseGoodText` / `parseGood`** (`src/lib/genshin/parseGood.ts`). The parser requires `format: "GOOD"`, drops invalid entries and unused fields (returning warnings, which the dashboard shows), turns empty `location` strings into `undefined`, and returns a normalized `GenshinData` in which every list is always present.
3. **`useGenshinData()`** (`src/hooks/useGenshinData.ts`) is the only way pages read or write this data. It returns `{ data, loadError, loading, save }` and stores the normalized data in **`localStorage["genshinData_<firebase uid>"]`** through `useSyncExternalStore`, parsing it again on read. Phase 1 of the design doc swaps its internals for Firestore; pages shouldn't touch localStorage for this data directly.
4. The types live in **`src/lib/genshin/types.ts`** (`GenshinData`, `GoodCharacter`, `GoodWeapon`, `GoodArtifact`, `GoodSubstat`). Import them from there rather than declaring local interfaces.
5. Equipped items are linked to a character by `weapon.location` / `artifact.location` matching `character.key`, not by being nested inside the character. Use **`buildEquipmentIndex(data)`** (`src/lib/genshin/equipment.ts`) to get each character's weapon and artifacts.

Other localStorage keys:
- `genshinShowcase_<uid>`: the 5-slot character showcase on the dashboard. `Genshin.tsx` reads it in a lazy `useState` initializer, which is safe because the dashboard only renders `Genshin` in the browser, after auth has loaded.
- `gachasavior-selected-game`: the selected game (`GameContext`, through `useSyncExternalStore`).

### Auth and Firestore

- `src/lib/firebase.ts` initializes the app from the `NEXT_PUBLIC_FIREBASE_*` environment variables (`.env.local` locally, the Vercel project settings when deployed), sets `browserLocalPersistence`, and exports `app`, `db` and `auth`. Each variable must be read as a literal `process.env.NEXT_PUBLIC_...` so Next.js can inline it.
- Firestore has two collections, written at sign-up (`create-account/page.tsx`):
  - `users/{uid}`: `{ username, email, createdAt }`
  - `usernames/{username}`: `{ uid }`, which lets people log in with a username.
- **Firestore rules (set in the Firebase console, not in this repo):** signed-out visitors can read `usernames` but not `users`. Authenticated reads work.
- **Username login:** `login/page.tsx` treats any identifier without an `@` as a username and POSTs it to **`/api/auth/resolve-username`** (`src/app/api/auth/resolve-username/route.ts`). The route looks up `usernames/{name}` and then `users/{uid}` with the Admin SDK and returns `{ email }`. Any failure returns the same 401 "Invalid username or password." Requests are rate-limited in memory to 10 per minute per IP, counted separately on each server instance. The page then signs in with `signInWithEmailAndPassword`. Username login can't read Firestore from the browser, because the rules block signed-out reads of `users`.
- `src/lib/firebaseAdmin.ts` (guarded by `import "server-only"`) initializes `firebase-admin` from `FIREBASE_SERVICE_ACCOUNT_KEY`, which is the service account JSON **base64-encoded** onto one line. It exports `adminDb`, which bypasses security rules, so use it only in API routes. The downloaded key file (`*-firebase-adminsdk-*.json`) is gitignored. Never print it or the env value.
- Sign-up creates the auth user, then claims `usernames/{username}` and writes `users/{uid}` in a single `runTransaction`. The transaction fails if the username already exists, and in that case the new auth user is deleted. Usernames can't be empty or contain `/` (it isn't allowed in a document ID) or `@` (login would treat the name as an email). Usernames are case-sensitive. Firestore security rules don't enforce any of this yet; that's planned for Phase 1.
- `AuthContext` (`useAuth()`) provides `{ user, username, loading, error }`, with `username` read from `users/{uid}`. Protected pages redirect to `/login` themselves when `!loading && !user`; there is no middleware.

### Providers and the multi-game scaffold

`src/app/layout.tsx` wraps the app as `GameProvider > AuthProvider`. `GameContext` (`useGame()`, with `GameId = "genshin" | "hsr" | "zzz"` and the `GAMES` list) is currently used only by the game-picker drawer in `header.tsx`. No page changes based on the selected game yet. The Genshin pages and `/characters`-style routes assume Genshin.

### Character names and portraits

- `src/lib/genshinCharacters.ts` has `GENSHIN_CHARACTERS`, the full playable roster with portrait filenames. The `/characters` page shows the whole roster, with owned characters (from the upload) marked against unowned ones. Matching uses `normalizeCharacterKey` (lowercase, removes spaces, `_`, `'` and `-`). Any Traveler variant maps to the `traveler` entry.
- Portraits are `public/character-portraits/<Name>_Icon.png`, taken from the Genshin fandom wiki. **When a new character is released:** add the PNG, add an entry to `GENSHIN_CHARACTERS`, and if the name is two words, add it to `CHARACTER_DISPLAY_NAMES` in `src/lib/utils.ts`.
- `src/lib/utils.ts` holds `cn()` and the display-name helpers. `formatKeyWithSpaces` turns PascalCase GOOD keys into spaced words. `formatCharacterIconFilename` turns a GOOD key into its portrait filename.
- `GenshinFeatures.tsx` (the public `/features` page, which shows a mock dashboard preview) has its own older copy of `formatCharacterIconFilename` instead of importing the one in `utils.ts`.
- Images fall back to `/placeholder.svg` through `onError`.

### UI conventions

The user wants to keep the current look. New pages and features should match it closely, and redesigns need the user's approval first. The full style guidance is in the "UI style" section of `docs/DESIGN.md`.

- Pages put their content between `<Header />` and `<Footer />`, with an indigo-to-purple gradient background (`bg-gradient-to-b from-indigo-100 to-purple-100`) and white `shadow sm:rounded-lg` cards.
- `src/components/ui/` holds generated shadcn/ui components (style "default", base color slate, CSS variables). Add new ones with the shadcn CLI rather than writing them by hand.
- Use the `@/*` import alias for `./src/*`.
- ESLint settings: unused variables are allowed if prefixed with `_`, and `any` is allowed.
- `.claude/launch.json` defines a `dev` configuration (`npm run dev` on port 3000) for previewing the app in the Claude desktop app.
