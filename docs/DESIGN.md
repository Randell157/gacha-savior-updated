# Gacha Savior: Roadmap and Design

Status: draft · Last updated: 2026-11-11

This document describes what comes next for Gacha Savior and how each piece will be built. For how the app works today, see [CLAUDE.md](../CLAUDE.md).

## Goals

1. **Data follows the account.** An upload made on one device shows up on every device the user logs in from.
2. **Genshin goes deeper.** The app moves from showing totals to answering real questions: which artifacts are good, what a character is wearing and how strong their kit is, and how close the user is to pity.
3. **A codebase that can grow.** One shared data layer and working lint, so new features and new games don't keep copying the same code.
4. **Keep the current look.** New pages and features use the same visual style the site has today, or one very close to it (see [UI style](#ui-style)). This plan doesn't include a redesign.

### Not in scope (for now)

- Honkai: Star Rail and Zenless Zone Zero. The game picker stays, but those games wait until the Genshin work below is done. Phase 1 keeps the data model game-aware so adding them later doesn't need a rewrite.
- Pulling wish history straight from the game's URL, and per-character artifact scoring. Both were considered and set aside (see [Decisions](#decisions)).

## Decisions

| Question | Decision | Why |
|---|---|---|
| Where uploaded data lives | Firestore, under the user's account | Works across devices and survives clearing the browser. |
| Next focus | Deepen Genshin before adding games | Finish one game well first. |
| Genshin features | Artifact analysis, detail pages, wish history tracker | Chosen. A material planner was considered and not included, then added to Phase 6 (2026-11-11). |
| Wish history source | UIGF JSON file import, plus paimon.moe Excel exports | UIGF is the standard format of Snap Hutao and other tools; paimon.moe has no UIGF export, and its Excel file is often the only record older than the game's six months. Both work like the GOOD upload and need no server. |
| Game data (stats, talents, images) | `genshin-db` npm package, extracted at build time | Works offline and is kept up to date (v5.2.14, updated Sept 2026). It's 187 MB unpacked, so it must never be shipped to the browser. |
| Artifact score | Crit Value: CRIT Rate × 2 + CRIT DMG | Widely understood and easy to explain. |
| Groundwork | Fix lint, shared types, Firebase config from env | Chosen. Tests deferred. |
| Username login | Keep it, with the email looked up by a server route using the Firebase Admin SDK | Keeps the current login experience without making emails publicly readable. |

## UI style

Every phase keeps the site's existing look. New pages should look like they were always part of the site.

- **Page shell:** `<Header />` and `<Footer />` around the content, with the indigo-to-purple gradient background (`bg-gradient-to-b from-indigo-100 to-purple-100`), a white title bar with an `indigo-900` heading, and content in white `shadow sm:rounded-lg` panels inside `max-w-7xl`.
- **Components:** use the shadcn/ui pieces already in `src/components/ui/` (Card, Tabs, Select, Button, Alert, ScrollArea, Sheet) and lucide-react icons. If something new is needed, such as a badge, table or pagination, add it with the shadcn CLI in the same "default" style so it matches.
- **Colours:** indigo stays the accent colour, as in the showcase slots (`border-indigo-200 bg-indigo-50/40`, `ring-indigo-500` on hover) and the header. New colours are only added where they carry meaning: element colours on character pages, artifact CV tiers and pity warnings. These stay soft (`-50`/`-100` backgrounds, `-700` text) so they sit comfortably with the indigo theme.
- **Layout patterns to reuse:** the count cards from the Genshin overview (the whole card is a link), the portrait grid from `/characters`, and the slot card from the showcase. For example, an artifact card in Phase 3 should look like a showcase slot, not like a new design.
- **Accessibility (WCAG 2.1 AA):** small text is at least `text-gray-500 dark:text-slate-400` (`gray-400` / `slate-500` fail contrast on white and slate-900). Controls without a visible label get an `aria-label`, form errors get `role="alert"`, and heading levels don't skip (use an `sr-only` heading if the design has none). An audit on 2026-11-02 brought the main pages to zero axe-core violations; the rules are in `CLAUDE.md` under UI conventions.
- **Small improvements are fine:** better spacing, mobile layouts, loading states and empty states, as long as the overall look stays the same.

If a phase needs a pattern the site doesn't have yet, build it from these same pieces. Any bigger visual change is for the user to decide; don't make it as part of a phase.

## Roadmap

Each phase builds on the one before it. Phase 2 comes first so later phases build on a consistent UI. Phases 3, 4 and 5 depend on Phase 1 but not on each other, so their order can change.

| Phase | Work | Depends on | Status |
|---|---|---|---|
| 0 | Groundwork: lint, shared types and parsing, env config, sign-up fix | — | **Done** (2026-11-01) |
| 1 | Firestore storage and one shared data hook | 0 | **Done** (2026-11-02) |
| 2 | UI review and consistency pass | 1 | **Done** (2026-11-02); still open for a few more UI changes the user is considering |
| 3 | Artifact analysis | 1 | **Done** (2026-11-06) |
| 4 | Character and weapon detail pages | 1 | **Done** (2026-11-06) |
| 5 | Wish history tracker | 1 | **Done** (2026-11-11) |
| 6 | Version 1.1: showcase and build card, upload changes, material planner, wish additions | 3, 4, 5 | Planned |

---

## Phase 0: Groundwork

> **Done (2026-11-01).** Every step below is built; [CLAUDE.md](../CLAUDE.md) describes how the code works now. Where the build differed from the plan:
> - **The shared data hook was built early.** Five ESLint errors came from pages reading localStorage inside `useEffect`. Rather than fixing each page, they now all use `useGenshinData()` (`src/hooks/useGenshinData.ts`), which is still backed by localStorage. Phase 1 only has to replace what's inside that hook.
> - **`eslint-plugin-react` crashes under ESLint 10** unless `settings.react.version` is set, so the config pins it to `"19"`.
> - **Usernames are still case-sensitive.** Lowercasing them now would lock out existing users whose usernames contain capitals, and some do. Phase 1 handles it with a migration (see "Case-insensitive usernames").
> - **Sign-up also rejects usernames containing `/` or `@`.** A `/` isn't allowed in a Firestore document ID, and a name with `@` could never log in, because login treats it as an email.
> - The sign-up transaction blocks username takeover through the app. Since 2026-11-01 the security rules block it outside the app too (see Phase 1, Security rules).

### 0.1 Fix lint

`npm run lint` runs `next lint`, which Next 16 removed. ESLint 10 also stopped reading `.eslintrc.json`.

- Replace `.eslintrc.json` with `eslint.config.mjs` using `eslint-config-next`'s flat config export. Keep today's rules: `react/no-unescaped-entities` off, `@next/next/no-page-custom-font` off, `no-explicit-any` off, and unused variables allowed with a `_` prefix.
- Change the script to `"lint": "eslint ."`.
- Fix whatever the first run reports.

**Done when** `npm run lint` exits cleanly.

### 0.2 Shared types and GOOD parsing

Right now the `GenshinData`, `Character`, `Weapon` and `Artifact` types are written out again in six files, and each copy is slightly different. Validation is a loose "has at least one array" check.

Create `src/lib/genshin/`:

- `types.ts`: one set of types matching the GOOD format, including the fields we ignore today: `ascension`, `talent { auto, skill, burst }`, `mainStatKey`, `substats[]`, `lock`, and artifact `totalRolls`.
- `parseGood.ts`: `parseGood(json): { data, warnings } | { error }`. It checks `format === "GOOD"`, accepts version 2 and 3, drops broken entries with a warning instead of rejecting the whole file, and normalizes empty `location` strings to `undefined`.
- `equipment.ts`: `buildEquipmentIndex(data)`, which maps each character key to their weapon and artifacts. This replaces the separate copies in `Genshin.tsx` and `characters/[key]/page.tsx`.

The two sample files show why lenient parsing matters. They come from different exporters (`Inventory_Kamera` with GOOD v2, and `Irminsul` with GOOD v3) and have different fields, such as `id`, `initialValue` and `astralMark`. The upload message should mention both exporters, not only Inventory Kamera.

**Done when** no page declares its own GOOD types, and both sample files parse with no errors.

### 0.3 Firebase config from environment variables

`src/lib/firebase.ts` hardcodes the config, and the `NEXT_PUBLIC_FIREBASE_*` values in `.env.local` are never read.

- Read the six values from `process.env.NEXT_PUBLIC_FIREBASE_*` and throw a clear error if one is missing.
- Add a `.env.example` with the variable names and no values.
- Set the same variables in the Vercel project before the next deploy, or the live site will break.

Firebase web config values are not secrets; they always end up in the browser. This change is about keeping config out of the code. Real protection comes from the security rules in Phase 1.

### 0.4 Sign-up can take over an existing username

`create-account/page.tsx` writes `usernames/{username}` without checking whether it already exists, so a new account can overwrite someone else's username and take over username-based login. Fix this together with the Phase 1 rules:

- Write the username with a transaction that fails if the document exists, and show "Username is taken."
- Back this up with a security rule that allows creating a `usernames` document but never updating it.

---

## Phase 1: Firestore storage

> **Built (2026-11-01) and tested against the Firebase emulators.** [CLAUDE.md](../CLAUDE.md) describes how the code works now. Where the build differed from the plan:
> - **Emulators first.** `firebase.json`, `firestore.rules`, and `npm run emulators` / `npm run dev:emu` were added so every sign-in and write could be tested locally under the demo project `demo-gachasavior`.
> - **`RequireAuth` waits for the user's data too**, not just auth, so pages inside it never handle a loading state. `/characters` stays public.
> - **The showcase is stored in the main document** (`showcase` field), not as a separate document.
> - **`AuthContext` now listens to the profile with `onSnapshot`.** Reading it once showed "Hello, User!" right after sign-up, because the profile is written just after the account is created.
> - **The lowercase-only rule came after the migration.** The `usernames` create rule now also requires `username == username.lower()`. Once published, it refuses sign-ups for names with capitals on the old deployed site, which writes names as typed; the new code always claims the lowercase name.
>
> **Tested on the emulator:**
> - All 19 rule checks pass: cross-user reads and writes, username takeover, extra fields, signed-out access.
> - Sign-up stores a lowercase claim and keeps the display name. A different capitalization is rejected, and no orphaned login is left behind.
> - Logging in as "TESTUSER" works.
> - A 1,717-artifact upload saves as the main document plus 5 chunks. A smaller re-upload deletes the extra chunks and keeps the showcase.
> - Reloading restores everything from Firestore, and the showcase syncs.
> - Signed-out visits to protected pages redirect to login.
> - Old localStorage data moves over and its keys are removed.
> - The migration script renames, removes duplicates and reports conflicts, and is safe to run again.
>
> **Live rollout (in order):**
> 1. ~~Deploy `firestore.rules`~~ **Done 2026-11-01**: pasted into the console. The CLI was logged in to a different Google account with no access to the project, so `firebase deploy` fails with 403 until the CLI logs in as the project owner. Verified: signed-out reads return 403 on every path, and a real login (zach) moved its localStorage upload into `users/{uid}/games/genshin`.
> 2. ~~Deploy the site~~ **Done 2026-11-02** as a new Vercel project, `gacha-savior-updated` (https://gacha-savior-updated.vercel.app/), deployed with the CLI from this folder. Checked signed out: every page returns 200, `/dashboard` redirects to `/login` with no console errors, and the username route answers an unknown name with 401 (so the Admin SDK key works). The old project at gachasavior.vercel.app was left running.
> 3. ~~Migrate usernames~~ **Done 2026-11-01**, run before the site deploy: 8 checked, "Justin" and "Lapid" renamed. One conflict, "Randell" vs "randell" (two test accounts), was left as is: "randell" keeps the name, and the `Randell` account can still log in with its email. The stale `usernames/Randell` document was deleted in the console on 2026-11-02.
> 4. ~~Remove the fallback and add the lowercase rule~~ **Done in code 2026-11-01**, tested on the emulator (capitalized claim 403, lowercase 200; any capitalization resolves; a leftover capitalized document no longer does). The updated `firestore.rules` was published in the console on 2026-11-02.

### Data model

The 2026 sample export is about 760 KB of JSON once whitespace is removed, and artifacts make up 690 KB of that (1,717 pieces). A Firestore document can hold at most 1 MiB, so one document per upload is already close to the limit and will go over as users collect more artifacts. Artifacts are therefore split into chunks.

```
users/{uid}                              existing: { username, email, createdAt }
users/{uid}/games/genshin                { source, format, version, uploadedAt,
                                           counts: { characters, weapons, artifacts },
                                           artifactChunkCount,
                                           characters: Character[],
                                           weapons: Weapon[],
                                           materials: Record<string, number> }
users/{uid}/games/genshin/artifactChunks/{0..n}   { items: Artifact[] }   (at most 400 per chunk)
users/{uid}/games/genshin/wishes/meta     { gameUid, lastImportedAt, totals, chunks }   (Phase 5)
users/{uid}/games/genshin/wishes/{pool}_{n}   { items: Pull[] }   (at most 2,000 per chunk)
```

- `games/{gameId}` keeps the model ready for `hsr` and `zzz` later.
- Characters (about 90), weapons (about 340) and materials (about 1,350 entries) add up to under 100 KB, so they fit comfortably in the main document.
- 400 artifacts per chunk is roughly 160 KB, well under the limit, with room for longer substat lists.

### Upload flow

1. Parse with `parseGood` (Phase 0.2).
2. In a single `writeBatch`: overwrite the main document, write the new chunks, and delete any old chunks numbered at or above the new count. A batch is all-or-nothing, so readers never see half of an upload. An upload is about 6 to 10 writes, far below the 500-write batch limit and the free tier's daily write allowance.
3. Show a "Last uploaded …" time on the dashboard using `uploadedAt`.

### One shared data hook

Pages already read through `useGenshinData()` (built in Phase 0, currently backed by localStorage). Move it behind a `GenshinDataProvider` in `src/contexts/` and back it with Firestore, keeping its return shape so pages don't change:

- It loads the main document and its chunks once per login and shares the result with every page. This also fixes the same `JSON.parse` work being repeated on every page.
- It keeps today's `{ data, loadError, loading, save }` and adds `lastUploadedAt`. `save` becomes async because it writes to Firestore.
- It reads the data once per session rather than listening for live changes. Data only changes when the user uploads, so live listeners would cost reads for nothing.
- Pages stop redirecting to `/login` themselves. A single `RequireAuth` wrapper does it.

### Moving existing localStorage data

When a user logs in, if `localStorage["genshinData_<uid>"]` exists and there's no Firestore document, upload it automatically, show a short "Your saved data was moved to your account" notice, and then delete the localStorage key. The showcase keeps working; its five slots also move into the main document as `showcase: string[]` so they sync too.

### Security rules

**Rules published as of 2026-11-01** (project on the Spark plan):

```
match /users/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
match /usernames/{username} {
  allow read: if true;
  allow write: if request.auth != null;
}
```

Problems with these:
- **Any signed-in user can overwrite or delete any username.** `allow write` covers update and delete, so someone could point another user's username at their own account directly through the Firebase SDK, skipping the sign-up transaction. This is the takeover that Phase 0.4 only blocks inside the app.
- **`match /users/{userId}` doesn't cover subcollections.** The Phase 1 documents under `users/{uid}/games/...` would be denied, so the rule needs the `{doc=**}` wildcard.
- **`usernames` doesn't need to be publicly readable any more.** Login goes through the server route, and sign-up reads it while signed in.

Target rules:

```
match /users/{uid}/{doc=**} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
match /usernames/{name} {
  allow read: if request.auth != null;       // login lookups go through the server route
  allow create: if request.auth != null
                && request.resource.data.uid == request.auth.uid
                && request.resource.data.keys().hasOnly(["uid"]);
  allow update, delete: if false;            // usernames can't be taken over
}
```

**The `usernames` part was published on 2026-11-01.** Signed-out reads and writes now return 403, and username login still works through the server route. The `{doc=**}` change ships with the Firestore storage work. Phase 1 also moves the rules into a `firestore.rules` file in the repo, tested against the emulator and deployed with the Firebase CLI. Everything in this phase stays within the Spark plan's free limits: one upload is about 6–10 writes and one session about 6–10 reads.

### Username login through a server route

> **Built early (2026-11-01).** Username login had stopped working: the project's Firestore rules already block signed-out reads of `users/{uid}`, so the browser could no longer look up the email. The route, `src/lib/firebaseAdmin.ts`, and the login page change below are now in place, with the service account key stored base64-encoded in `FIREBASE_SERVICE_ACCOUNT_KEY`. The rule requiring sign-in to read `usernames` was published the same day. Still to do in Phase 1: make usernames case-insensitive (see below).

### Case-insensitive usernames

Some existing `usernames` documents contain capital letters (confirmed 2026-11-01), so this change needs a migration.

- **Storage:** the `usernames` document ID becomes the lowercased name. `users/{uid}.username` keeps the name exactly as the person typed it, for display.
- **Sign-up** claims `usernames/{name.toLowerCase()}`, so "Zach" and "zach" can't both be registered.
- **Login route** looks up only the lowercased name. Until the migration ran it also fell back to the exact name; that fallback was removed afterwards.
- **Migration script:** `scripts/migrate-usernames.mjs` runs once, locally, with the Admin SDK. It does a dry run by default and only prints counts and conflicts; `--apply` performs the changes. For each document whose ID has capitals:
  - If no lowercase document exists, create it with the same `{ uid }` and delete the original, in one batch.
  - If a lowercase document already exists for a different account (two people registered "Zach" and "zach"), skip it and list it. **The user decides** which account keeps the name. The script never chooses.
- **Order:** deploy the sign-up and route changes first, run the dry run, resolve any conflicts, run `--apply`, then remove the fallback. Test the whole sequence against the emulator before touching the live project.
- The Admin SDK isn't limited by `allow update, delete: if false`, so the migration needed no rule change. After it ran, the create rule gained `username == username.lower()`.

Today, logging in with a username reads `users/{uid}` to get the email *before* the user is signed in. The rules above block that read, and allowing it would let anyone read everyone's email address. Instead, the email lookup moves to the server:

- **New route `POST /api/auth/resolve-username`** (`src/app/api/auth/resolve-username/route.ts`). It takes `{ username }`, reads `usernames/{username}` and then `users/{uid}` with the Firebase Admin SDK, and returns `{ email }`. The browser never reads `users/{uid}` while signed out.
- **Admin SDK setup:** add `firebase-admin` and initialize it in `src/lib/firebaseAdmin.ts`, a server-only module guarded with `import "server-only"`. The service-account key is stored in a `FIREBASE_SERVICE_ACCOUNT_KEY` environment variable in `.env.local` and Vercel, with **no** `NEXT_PUBLIC_` prefix so it never reaches the browser.
- **Login page:** if the identifier has no `@`, call the route, then sign in with `signInWithEmailAndPassword` as before. Usernames are compared in lowercase.
- **Abuse protection:** the route returns the same generic "Invalid username or password" error whether or not the username exists, so it can't be used to check which usernames are registered. It also sets a basic per-IP rate limit.
- **Rules:** `usernames` no longer needs to be publicly readable. The route reads it through the Admin SDK, which bypasses security rules. Sign-up still has to check whether a username is taken, which it can do inside its transaction once the user is signed in. So `allow read` changes to `if request.auth != null`.

Returning the email to the client means someone who knows a username can find out that user's email. That's an accepted trade-off of username login, and it's far less exposure than making every email publicly readable. Removing it completely would need a custom-token sign-in flow, which can be added later if needed.

Option considered and rejected: storing the email in `usernames/{name}`, which would make every email publicly readable. Dropping username login was the other alternative; it was turned down in favour of keeping the current login experience.

**Done when** data uploaded on one browser shows up after logging in on another, and a user cannot read another user's documents.

---

## Phase 2: UI review and consistency pass

Go over every page before adding features, so Phases 3–5 build on one consistent set of pieces. The look stays the same (see "UI style"); this phase fixes what's broken or inconsistent and pulls repeated code into shared components. Reviewed 2026-11-02 in code and in the browser, at desktop and phone widths.

> **Built (2026-11-02) and tested on the emulators** at desktop and phone widths: sign-up, upload, every page, the phone menu and the account menu, with no console errors. [CLAUDE.md](../CLAUDE.md) describes the result. Every finding below is fixed except the weapon and artifact placeholder images, which stay until Phase 4 adds real icons. Weapon cards now also show who has the weapon equipped.

### Findings: broken or clearly wrong

- **404 page has no styling.** `not-found.tsx` is bare text and a plain button, with no header, footer or background.
- **Header on phones:** the "Gacha Savior" link gets squeezed to a couple of letters because the Features, About, Contact and account links take all the width.
- **Header flashes "Login" while auth loads.** The greyed-out "Login" looks like the user was signed out, then switches to their name a moment later.
- **`/profile` is a stub.** It just says "Profile page." and nothing links to it.
- **Footer says © 2024.**
- **Invalid HTML:** Home, About and Contact put a `<main>` inside another `<main>`.
- **Login form label** points at `id="email"`, but the input's id is `identifier`, so screen readers don't connect them.
- **Raw data keys on screen:** the artifacts page shows `hp_`, `critDMG_: 7.8`, `sands`; weapon and material names elsewhere are already made readable.
- **Dashboard error screen** (when the profile fails to load) drops the header, footer and background.

### Findings: inconsistent

- **Two primary button styles.** Login and Create Account use hand-styled indigo buttons and inputs; every other page uses the shadcn `Button`, whose default is near-black (slate-900).
- **Two kinds of dropdown.** `/characters` uses native `<select>`s; the dashboard uses the shadcn `Select`.
- **Page shell copied into every page.** About 20 lines (Header, gradient, white title bar, panel, Footer) are repeated in 13 files, with drifting padding (`py-8` vs `py-12`, panel `p-6` vs `p-8` vs `px-4 py-8 sm:p-8 lg:p-10`).
- **Two headings on the dashboard:** the page title "Dashboard" and then a large "Genshin Impact" heading inside the panel.
- **Loading text differs:** "Loading your data..." (protected pages) vs "Loading character data..." (`/characters`).
- **Weapon and artifact cards** show a placeholder image on every card, since no icons exist yet (Phase 4 adds them).

### Not a UI bug

- Some characters show "No weapon equipped." The Irminsul sample export has 15 characters with no weapon in the file (Amber, Lisa, Thoma and others); the Inventory Kamera export has none missing. The page could say "No weapon in your export" instead.

### Plan

**Decisions (2026-11-02),** chosen from side-by-side mockups:

- **Buttons:** primary buttons are indigo everywhere (`bg-indigo-600`, `hover:bg-indigo-700`), set once as the shadcn `Button` default rather than per page.
- **Phone header:** below the `sm` breakpoint, Features, About and Contact move into the ☰ side menu, above the game list. The bar keeps the logo and the account menu. Desktop is unchanged.
- **Profile:** build a simple `/profile` page (username, email, joined date from `users/{uid}.createdAt`, last upload), protected by `RequireAuth`, using the same row layout as About and Contact, and linked from the account menu above Logout.
- **Dashboard:** "Genshin Impact" becomes a smaller section heading (`text-lg font-semibold text-indigo-900`).

Then:

1. A shared `PageShell` component (title, optional actions next to the title, content panel) that every page uses, keeping today's look.
2. Fix everything under "broken or clearly wrong".
3. Unify buttons, inputs and dropdowns on the shadcn components.
4. Readable stat names through `STAT_LABELS` in `src/lib/genshin/stats.ts` (moved here from Phase 3, which reuses it).

**Done when** every page uses the shared shell and components, the phone header shows the full logo, and no page shows a raw data key.

---

## UI additions (chosen and built 2026-11-02)

Picked from side-by-side mockups after Phase 2, then built and tested on the emulators in light and dark: sign-up, drag-and-drop upload, the dashboard, roster gradients, every weapons control, the theme menu and the loading skeletons. [CLAUDE.md](../CLAUDE.md) describes how they work. Nine recent characters still need their rarity filled in (listed in CLAUDE.md); their portraits show a plain background until then. The Cards / Table switch is built from two buttons rather than the shadcn ToggleGroup, whose install needs an interactive npm prompt under React 19.

- **Dark mode**, as mocked: `next-themes` with Light / Dark / System in the account menu, and a moon icon button next to Login when signed out. The gradient becomes `indigo-950` → `purple-950`, panels and the title bar dark slate, headings `indigo-200`; buttons stay indigo, showcase slots keep a low-opacity indigo tint, unowned characters stay greyed out.
- **Rarity styling: in-game gradients.** 5★ portraits get a gold gradient background and 4★ a purple one, on the roster, showcase and character pages. Needs a `rarity` field on each `GENSHIN_CHARACTERS` entry.
- **Upload area: drop zone + compact bar.** Before the first upload, a drag-and-drop zone with a "How do I export my account?" section. After it, a compact bar (last upload, counts, "Upload new export" button). A confirmation message after each successful save.
- **Weapons page: cards and table, with a toggle.** A toolbar with search, sort, an All / Equipped / Unequipped switch and "Group copies" (×N), plus a Cards / Table view toggle. Cards show level and refinement badges and who has the weapon equipped; the table has sortable columns.
- **Loading skeletons** shaped like the dashboard and the character grid, replacing "Loading your data...".
- **Logo: "GS" monogram** in a rounded indigo square, used in the header and as the favicon.
- **Home page: the roster wall** (option D, chosen after the first mockup felt too generic). A dark indigo hero filled with real character portraits on their rarity gradients, a few greyed out like the Characters page, fading to solid at the bottom behind the heading "Which of your characters did you actually build?", a one-line pitch, and "Create an account" / "See the features" buttons. Below it, three steps on the usual gradient: scan your account with Inventory Kamera or Irminsul, upload it here, look around. Signed-in visitors go straight to the dashboard.

## Games hub and per-game sections (built 2026-11-02)

Done ahead of Phases 3–5 so their new pages land in the right place. Chosen from a mockup (Hub A).

- `/dashboard` is now "Your games": a large Genshin Impact card (portrait strip, last upload, counts, showcase preview, "Open Genshin Impact") and "Coming soon" cards for Honkai: Star Rail and Zenless Zone Zero. Logging in lands here.
- The Genshin pages moved under `/genshin` (`/genshin`, `/genshin/characters`, `/genshin/weapons`, `/genshin/artifacts`), with a breadcrumb back to the hub and section tabs. Old addresses redirect.
- The ☰ picker opens a game's section; coming-soon games can't be picked.
- Phases 3–5 now add their pages under `/genshin` (e.g. `/genshin/weapons/[key]`, `/genshin/wishes`) and a tab in `GenshinShell`.
- Tested on the emulators: every redirect, the hub, tabs and breadcrumbs on each page, the picker, and a production build.
- The signed-out home page took in the Features page (from a mockup): rewritten feature cards under "What you can do", the sample dashboard, and a closing sign-up band. The header's Features link and "See the features" scroll there; `/features` stays for signed-in users.
- The overview's count cards dropped their "View all" buttons, which duplicated the section tabs: each whole card is now the link (Option A from a mockup).

---

## Phase 3: Artifact analysis

Rebuild `/artifacts` from a plain list into a tool for finding good and bad artifacts.

### Scoring

```
CV = critRate_ × 2 + critDMG_         (taken from substats; the main stat is not counted)
```

The main stat is left out of the score; that's the common convention, and otherwise every crit circlet would score high. Score tiers for a level 20, 5-star piece:

| Tier | CV |
|---|---|
| Excellent | 40 and up |
| Great | 30 to 39.9 |
| Good | 20 to 29.9 |
| Low | under 20 |

The tiers live in `src/lib/genshin/artifactScore.ts` so they're easy to adjust. Pieces below level 20 show their CV with a "still leveling" badge, because they're still gaining substats.

### Page features

- A grid of cards showing the set, slot, main stat, substats with readable names (`critDMG_` becomes "CRIT DMG%"), level, rarity, CV with its tier colour, and who has it equipped.
- Filters for set, slot, main stat, rarity, equipped or unequipped, and locked or unlocked. Sorting by CV, level or set.
- A summary strip: the average CV of equipped artifacts, and how many unequipped level-20 pieces are below 20 CV (likely fodder).
- Readable stat names come from the `STAT_LABELS` map added in Phase 2 (`src/lib/genshin/stats.ts`), which Phase 4 reuses too.
- Set icons: `public/artifact-icons/` is empty today. Fill it from the Phase 4 build script, or show the set name until then.
- Large inventories (1,700+ pieces): start with pagination at 60 per page. Add a virtualized list only if the page actually feels slow. **Already in place (2026-11-02):** the page opens on equipped pieces grouped by character, and All / Unequipped load 60 at a time. Phase 3's filters and sorting should build on that toggle rather than replace it.

**Done when** the user can find their weakest unequipped pieces and best pieces in a few clicks, and every character's equipped artifacts show a CV.

**As built** (picks 1B, 2A, 3C, 4B from `.mockups/artifact-score.html`): circlets with a CRIT main stat show their CV but no tier, and stay out of Low and the fodder count, because they can't roll that stat as a substat (in the Irminsul sample the best of 88 reached 27.2). Lower rarities show a CV as "Not rated". The summary tiles sit under the Show row rather than above it, so that row doesn't jump when switching to Equipped.

---

## Phase 4: Character and weapon detail pages

### Game data, prepared at build time

`genshin-db` is far too large to import in a page. Instead, a script extracts only what we need:

- `scripts/build-game-data.mjs` reads `genshin-db` and writes `src/data/genshin/characters.json` and `weapons.json`. Each character gets its element, weapon type, rarity, region, base stats at key levels, talent names and descriptions, and constellation names. Each weapon gets its type, rarity, base ATK, substat curve, and passive at each refinement.
- It runs from `npm run data:genshin`. The JSON output is committed, so building the app never needs `genshin-db` installed.
- **Started early (2026-11-02):** the script exists and writes `src/data/genshin/artifactSets.json` (set names and 2-/4-piece bonuses, genshin-db 5.2.14, 63 sets, every set in the sample exports matched). The equipped artifacts view uses it to show each character's active 2-piece and 4-piece bonuses. This phase extends the same script with characters and weapons.
- Keys are matched with `normalizeCharacterKey`, and the script prints any roster character it couldn't match (for example, Traveler variants).
- After each game patch: update `genshin-db`, rerun the script, and commit the result.

### Character page (`/genshin/characters/[key]`)

**Started early (2026-11-04):** the talents with descriptions, all six constellations and base stats are built, and the signed-out quick view shows them too. [ARCHITECTURE.md](ARCHITECTURE.md) describes them.

- Header: portrait, name, element and weapon icons, rarity, level, ascension and constellation.
- **Talents**: the user's Normal Attack, Skill and Burst levels from the GOOD `talent` field, with names and descriptions from the game data.
- **Constellations**: all six, with the unlocked ones highlighted.
- **Equipped gear**: the weapon card linking to its page, and the five artifacts with their Phase 3 CV, plus active set bonuses (2-piece and 4-piece).
- **Stats**: base HP, ATK and DEF at the character's level. Full final stats with every bonus included would need a complete damage calculator, so that's out of scope; the page says "Base stats" clearly.

### Weapon page (`/genshin/weapons/[key]`)

A new route. It shows base ATK and the substat at its level, the passive at the user's refinement, and who has it equipped. It also lists other copies the user owns, since `/weapons` can show duplicates.

**Done when** every owned character and weapon has a full page, and the build script runs without unmatched keys apart from known ones.

**As built** (picks B and 1 from `.mockups/weapon-page.html`): the weapon page keeps the weapon on top and lists every copy in a table with its own numbers, so there's no chosen copy. The passive opens on the highest refinement owned, with a star on each one owned. The whole card or row in the Weapons list links to the page, and so does the weapon's name on the character page. How it works is in [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Phase 5: Wish history tracker

> **Done (2026-11-11).** Committed as `7e06a41` and deployed; how it works is in the "Wish history" section of [docs/ARCHITECTURE.md](ARCHITECTURE.md). Besides the plan below, it also reads paimon.moe Excel exports, and pressing a chart month with a 5★ finds it in the 5★ history.

### Import

- A new route, `/genshin/wishes`, with a UIGF JSON upload, and paimon.moe's Excel export as well (picked 2026-11-08: paimon.moe has no UIGF export, and UIGF tools only reach the game's last six months, so older history often exists only there). Support **UIGF v4** (the `hk4e: [{ uid, list }]` layout) first, and accept **v3** (`info` and `list`). Reject other games' sections with a clear message.
- **Merge, don't replace.** Pulls are identified by their `id`, so importing a newer export adds only the new pulls and keeps older ones the game no longer shows. The game only shows about 6 months of history, so keeping it is a key reason to use this feature.
- If an export contains more than one game account (UID), ask which one to import.

### Storage

```
users/{uid}/games/genshin/wishes/meta                 { uid, lastImportedAt, totals }
users/{uid}/games/genshin/wishes/{poolKey}_{n}        { items: Pull[] }   (at most 2,000 per chunk)
```

Pull history can reach thousands of entries, so it's chunked by pool, the same way artifacts are.

### Pools and pity

| Pool | `gacha_type` | Hard pity |
|---|---|---|
| Character Event | 301 and 400 (shared pity) | 90 |
| Weapon Event | 302 | 80 |
| Standard | 200 | 90 |
| Chronicled Wish | 500 | 90 |
| Beginners' | 100 | — |

### Features

- For each pool: current pity (pulls since the last 5★ and 4★), total pulls, number of 5★s, and average pulls per 5★.
- The 5★ history as a list showing how many pulls each one took, coloured by whether it came early or close to hard pity.
- On the Character Event pool: whether each 5★ won or lost the 50/50, worked out by comparing it with the standard 5★ roster from the Phase 4 data. Since version 5.0, the game's "Capturing Radiance" rule changes the odds after repeated losses, so the next pull's guarantee status is shown as an *estimate* with a short note.
- A simple pulls-per-month chart (using the dataviz guidance), added after the core stats.

**Done when** importing two overlapping exports gives the right merged total with no duplicate pulls, and pity matches what the game shows.

### Steps, and what finished means for each

A step is finished only when every box is checked. Each check is verified (run, opened or read back), not assumed, and the step's report lists the boxes with what showed each one.

1. **Logic** — done 2026-11-07
   - [x] `src/lib/genshin/wishes.ts` reads UIGF v4 (every UID) and v3, and rejects other games' files and non-UIGF files with a clear message
   - [x] Names and rarities come from `wishItems.json` by item ID, falling back to the export's own fields
   - [x] `mergePulls` adds by pull ID: an overlapping export adds only new pulls, and the same file twice adds nothing
   - [x] Pity per pool (5★ and 4★), both Character Event banners sharing one pity, average per 5★, the 50/50 and the next pull's guarantee
   - [x] Unit tests cover all of the above (`npm test` passes), plus merging the two made-up test exports
   - [x] Pity checked against real data: every 5★ and 4★ in the user's paimon.moe export matched
   - [x] `docs/ARCHITECTURE.md`, `CLAUDE.md` and the README credits updated
2. **Mockup** of `/genshin/wishes` (`.mockups/wishes.html`, 2026-11-08)
   - [x] Standalone HTML in `.mockups/`, open in the browser pane on the `mockups` server
   - [x] Option toggles at the top for each choice, plus Light/Dark, Desktop/Phone and Show/Hide changes, with what's new marked
   - [x] Numbers are real, worked out by `wishes.ts`, not typed in by hand (`.mockups/wish-data.js`, from the user's paimon.moe history and the merged test exports)
   - [x] Covers: the tab in the Genshin section, the import area, choosing a UID when a file has several, the result of an import ("N new wishes added"), each pool's summary, the 5★ history with pity and 50/50, the guarantee estimate and its note, the empty state and the signed-out view (plus a wrong-file error)
   - [x] Follows the UI conventions: current look, dark-mode partners, small text contrast, sentence case, "owned"
   - [x] Checked in light, dark and phone width with no overflow or console errors (all 48 state, data, size and option combinations checked for overflow)
   - [x] The user has picked an option for every choice: **1A** banner chips and stat tiles, **2A** rows with pity bars, **3A** a 50/50 chip on every 5★ with the next pull's estimate, **4A** an import bar above the stats, **5B** paimon.moe Excel files accepted too (2026-11-08)
3. **Storage** (`src/lib/genshin/wishStore.ts`, 2026-11-10)
   - [x] Pulls saved under `users/{uid}/games/genshin/wishes/` as in "Storage" above: a `meta` document and chunks of at most 2,000 pulls per pool (a 3,637-pull pool made `character_0` and `character_1`; unit tests for the split and read-back)
   - [x] Security rules allow only the owner (on the emulator, a second signed-in user was refused reading the meta and a chunk, writing and deleting)
   - [x] Deleting the account also deletes wish history (the delete route's `recursiveDelete` left no wish documents on the emulator)
   - [x] Deleting the GOOD upload keeps wish history (it's stored apart, so `deleteGenshin` doesn't touch it; the user agreed on 2026-11-10). Profile's Delete data panel gets its own "Delete wish history" (`deleteWishes`), added to step 5's boxes.
   - [x] Saved and read back on the emulators, including a merge over existing history (1,253 saved, then the newer export added 528 for 1,781 with no duplicate IDs and the same pity), and a smaller save deletes stale chunks
4. **Import**
   - [x] Upload on the wishes page accepts UIGF v4 and v3; errors show as an alert with a title and what to do next (on `dev:emu` 2026-11-10: v4 imported through the page, v3 by the unit tests on the same parser; a .txt, broken JSON, a GOOD file, another game's export and a fake .xlsx each showed "Import failed" with their own next step)
   - [x] It also accepts paimon.moe's Excel export (.xlsx, read in the browser with no new library), with unit tests; those wishes have no IDs, so they match by banner, time, name and order within the same second, and a later paimon.moe or UIGF import over them adds no duplicates (the logic, 2026-11-10: `src/lib/xlsx.ts`, `parsePaimon`, `mergePulls`; the upload itself comes with the page)
   - [x] The user's own paimon.moe file imports with the same totals and pity as paimon.moe shows (read with the site's `readXlsx` and `parsePaimon`: 4,752 wishes, every 5★ pity matching, the same file again adding 0; to repeat through the page in step 5)
   - [x] A file with several UIDs asks which one to import ("Choose an account" with native radios; the arrow keys move the choice; picking a different UID than the saved one is refused with how to switch)
   - [x] Importing reports how many wishes were new; importing the same file again adds 0 ("No new wishes: all 1,253 wishes in this file were already saved.")
   - [x] The two made-up test exports, imported in either order, give the same total as the merge test (unit tests for every order; through the page: `wishes-paimon.xlsx` 1,253, then `wishes-newer.json` +528 = 1,781, then `wishes-older.json` +0; Firestore then held 1,781 wishes, every one with its real game ID)
5. **Page** (2026-11-10)
   - [x] `/genshin/wishes` with its `layout.tsx` title ("Wishes · Genshin · Gacha Savior"), a Wishes tab in `GenshinShell`, inside `PageShell`
   - [x] Every element the user picked in the mockup is there: 1A banner chips and five tiles, 2A rows with pity bars and 10 per page, 3A a 50/50 chip on every Character Event 5★ and the next pull's estimate, 4A the import bar above the stats, 5B .xlsx accepted
   - [x] Skeleton while loading, an empty state before the first import, and a signed-out view (the made-up history under the log-in banner)
   - [x] Profile's Delete data panel has "Delete wish history", confirmed in a dialog like the others (option A from `.mockups/delete-wishes.html`, picked 2026-11-10), and deleting the GOOD upload leaves wishes in place (on `dev:emu` with a throwaway account: after Delete upload, the GOOD document was gone and all five wish documents stayed and still showed on the Wishes page; Delete wish history then left none; the status line took focus both times)
   - [x] Long lists are paged; dark-mode partners, `aria-label`s and copy rules followed (lint and type check pass)
   - [x] Checked on `dev:emu` in light, dark and phone width with the `copytest` account, and pity matches the test data's expected numbers (Character Event 6 / 90, 8 / 10, 1,137 wishes, 17 5★, 66.5; Weapon 15, Standard 62, Chronicled 5; no sideways scroll at 375 px; every history icon loads)
6. **Pulls-per-month chart** (after the core stats; mockup first: `.mockups/wish-chart.html`, 2026-11-11)
   - [x] Mockup with options A (all wishes, one color), B (stacked by banner) and C (the chosen banner, with gold dots on months with a 5★), real numbers from `wishes.ts`, checked in 72 combinations of theme, width, data, option and range with no overflow or label overlap
   - [x] Colors run through the dataviz validator against the site's surfaces (white and `slate-900`): one color is `indigo-600` light / `indigo-500` dark (`indigo-400` failed the dark lightness band); B's four are the reference palette's first four slots (pass; aqua and yellow are under 3:1 on white, so the legend and table are required); the 5★ dot is `amber-600` in both modes (`amber-500` failed in dark)
   - [x] The user has picked an option: C (2026-11-11)
   - [x] Built in `WishStats` under the 5★ history (`src/components/WishesPerMonth.tsx`): columns at most 24 px with 4 px rounded tops, hairline grid, a 12 months / 2 years / All range, a hover and keyboard-focus tooltip per month, a legend (the banner's wishes and the 5★ dot), and "Show as a table" with every number (a focusable scroll area)
   - [x] Unit tests for the monthly counts (`monthlyCounts`: empty months filled, 5★ names, totals adding up on every pool; 53 pass); checked on `dev:emu` in light, dark and phone width, matching the logic's numbers (Character Event: 557 for 12 months with 9 dots, 1,092 for 2 years with 16, 1,137 all time; Weapon Event 290 with 5; Tab reaches each month and shows its tooltip; no console errors, no sideways scroll, no label overlaps at 375 px)
   - **Pressing a month with a 5★ finds it in the 5★ history** (the user's idea after trying the test build, 2026-11-11; mockup `.mockups/chart-click.html`)
     - [x] Mockup with options A (turn to the history page holding that month's 5★s, scroll, highlight the rows) and B (filter the history to that month with a "Show all" chip), checked with the user's data by mouse and keyboard, no console errors or overflow
     - [x] The user has picked an option: A (2026-11-11)
     - [x] Built: months with a 5★ are buttons (click, Enter or Space) whose name ends "Show in the history"; months without one stay as they are. Pressing one turns the history to the page holding that month's newest 5★, scrolls to it and highlights every 5★ row from that month (a fading flash, or a steady highlight with reduce motion on); the month stays tinted in the chart until another month, banner or history page is chosen
     - [x] Checked on `dev:emu` (with the signed-out sample, the same 1,781 test wishes `copytest` has) in light and dark, by mouse and keyboard: Feb 2024 turned to page 2 and highlighted Jean, Jan 2026 back to page 1 and Venti, Next cleared it, the live region announced each; the flash keyframes compiled (the user's reduce-motion setting gets the steady tint); no new console errors, no sideways scroll; lint and type check pass; `wishes.spec.ts` updated (not run)
7. **Tests and docs**
   - [x] Unit tests for any new logic; `npm test`, lint, `npx tsc --noEmit` and `npm run build` pass (2026-11-11: 53 unit tests; the build lists `/genshin/wishes`)
   - [x] E2E specs updated (import, pity shown, page in the `a11y` spec), run when the user asks (2026-11-11, at the user's request: all 70 passed in 5.5 minutes, the 61 from before plus 9 in `wishes.spec.ts`, with the Wishes page in the `a11y` spec in both themes)
   - [x] `docs/ARCHITECTURE.md` and `CLAUDE.md` describe what was built (done); README credits complete (UIGF and paimon.moe added); this phase is marked done once step 8 ships (done 2026-11-11)
8. **Release** (only when the user asks)
   - [x] Test build served on localhost for the user to check (2026-11-11, twice: before and after the chart-click addition)
   - [x] Committed (`7e06a41`), then deployed (2026-11-11), and the live wishes page and API routes checked: `/`, `/genshin`, `/genshin/wishes`, `/profile` and the sample wish files return 200; the account and username routes answer an empty request with 401; signed out, the live page shows the sample (6 / 90) and pressing Feb 2024 highlights Jean, with no console errors

## Phase 6: Version 1.1

> **Planned (2026-11-11).** Version 1.0 shipped with Phase 5. Phase 6 is the 1.1 release: a better showcase, a material planner and smaller additions that use data the site already has. Nothing here needs a new Firestore collection or a paid Firebase plan. Public profiles wait for a later version, once it's decided what they show and how sharing is turned on.

### Showcase slots that show the build

Today a slot on the Genshin overview shows the portrait, name, "Lv. 90 · C2", the weapon as a line of text and "Artifacts: 5 equipped". Each slot should show the build at a glance, from components the site already has:

- Total Crit Value with its tier colour, the same number as the Artifacts page's Equipped view (`critValue`).
- The weapon's icon with Lv / R chips (`WeaponIcon`), instead of the text line.
- Active set bonuses as small badges, such as "4-piece · Emblem of Severed Fate" (from `activeSets`).
- Talents as "9 / 10 / 10", as on the roster tiles.
- Five small artifact icons (`ArtifactIcon` size `xs`), with a dashed square for a missing piece.
- Layout B from the mockup: the portrait on the left with the name, level, constellation and talents beside it, then the weapon, the pieces, Total CV and the set bonuses.
- More, picked from `.mockups/showcase-ideas.html`: the sands, goblet and circlet main stats; CRIT Rate and CRIT DMG from artifacts; what's still missing (plain facts only); what changed since the last upload; Fill empty slots; reordering; a title per showcase; constellation dots; the weapon's passive on its name; and up to five showcases in tabs. Teams of four with elemental resonance, and Share, were left out for now.
- Two display settings the player can turn on: **element colors** (a soft tint of the character's element on each card, with a dot by the name; element colours are one of the places the UI style allows new colour) and **CV on each piece** (a small CV under each artifact icon in its tier colour). Both start off, which keeps today's indigo cards and Total CV only. Where the switches sit and where the choice is saved are settled in a second mockup.

The home page's sample showcase uses the same component, so it gets the same look.

### Featured build card

A larger card for showing off one character, the way a player would screenshot their build: a big portrait, level, constellation and talents, the weapon with its passive, all five artifacts with each piece's CV, the set bonuses and Total CV. Where it sits is a mockup choice: the top of the character page, a "Featured" spot above the five showcase slots, or both.

- **Stats stay honest.** Full final stats are out of scope (see PRODUCT.md). The card may show totals from artifacts only, labeled that way ("+62.2% CRIT Rate from artifacts"), and never presents them as the in-game numbers.
- **Save as image** is an option to decide in the mockup. It needs a library to turn the card into an image (credited in the README) and pairs well with public profiles later.
- **Splash art** would need new images (credited to HoYoverse); the first version uses the existing portraits.

### What changed since your last upload

When an upload replaces an earlier one, show what changed: characters and weapons added, level, constellation and talent increases ("Furina: talents 9/9/9 → 10/10/10"), and how many artifacts were added or removed. It's worked out in the browser from the data already loaded before the new file is saved, so it needs no extra storage, and it shows once, after that upload. The first upload has nothing to compare and shows the usual message.

Each showcase slot already shows its character's changes (built in step 1, from the `previousBuilds` snapshot saved with each upload), so this step adds the account-wide summary after an upload and can reuse `buildChanges`.

### Material planner

Pick a character, a target level and target talent levels, and see what's still needed, against the `materials` in the upload: each material with how many you have and how many you need, and what's missing first. A weapon gets the same with a target level.

- Costs come from `genshin-db` at build time, like the other game data: characters' `costs.ascend1`–`ascend6`, talents' `costs.lvl2`–`lvl10`, and weapons' ascension costs, written to a new JSON file by `scripts/build-game-data.mjs`. EXP books, Mora and weapon ore for levels are a separate question to settle in the logic step.
- Material keys in the export are matched to the game data's names with the existing `materialName` helpers.
- It's a planner, not a calculator: it counts materials and doesn't estimate resin or days.
- Where it lives (a section on the character and weapon pages, a new Planner tab, or both) is a mockup choice.

### Wish history additions

- Primogems spent: wishes × 160, shown as an estimate (some wishes were bought with Starglitter or bought outright).
- Character Event 50/50 record: won, lost and the win rate, next to the chips already on each 5★.
- Download your merged history as a UIGF v4 file, so it isn't kept only on the site.

**Done when** the showcase and build card show the build with CV in light, dark and phone width, the planner's counts match the game's costs for a few hand-checked characters and weapons, a second upload lists exactly what changed, and the downloaded UIGF file imports back with 0 new wishes.

### Steps, and what finished means for each

A step is finished only when every box is checked. Each check is verified (run, opened or read back), not assumed, and the step's report lists the boxes with what showed each one. The steps don't depend on each other except tests, docs and release, so their order can change; the user picks which comes first.

1. **Showcase slots**
   - [x] Mockup (`.mockups/showcase-slots.html`) with option toggles at the top, Light/Dark, Desktop/Phone and Show/Hide changes, using a real export's numbers (2026-11-11: layouts Today / A stacked / B side by side / C CV first, Indigo or Element card color, Total only or each piece's CV; Built team, Missing gear and 3 picked from the Irminsul sample export, CV from the site's `critValue` and `scoreTier`; wide, tablet and phone widths; all 288 combinations checked with no overflow or console errors)
   - [x] The user has picked an option for every choice: **1B** side by side; **2** element colors and **3** CV on each piece both become settings the player can turn on (2026-11-11)
   - [x] Mockup of the two settings' switches and where they're saved, and the user's pick: **A**, two switches on the right of the showcase heading (`.mockups/showcase-settings.html`), saved with the account (2026-11-11)
   - [x] Built in `src/components/Genshin.tsx` (the overview and the home page sample), with dark-mode partners, `aria-label`s and copy rules (2026-11-11: `ShowcaseSlot.tsx`, `ToggleSwitch.tsx`, `CvMini`; settings saved as `showcaseOptions` by `setShowcaseOptions`; lint, type check and 54 unit tests pass; the showcase e2e test now covers the switches and their saving, not run)
   - [x] Checked on `dev:emu` in light, dark and phone width: CV matches the Artifacts page's Equipped view for the same characters, empty and partly equipped slots look right, no sideways scroll or console errors (2026-11-11 with `copytest`: Yoimiya 163.2, Yelan 132.2 and Lynette 38.8 with her two missing pieces as dashed squares; both switches turned on, kept after a reload and read back from Firestore as `showcaseOptions`; the home page sample's switches work unsaved; no sideways scroll at 375 px; no console errors from the page)
   - [x] More ideas, all in one mockup (`.mockups/showcase-ideas.html`, 2026-11-11), each with its own toggle: main stats, build gaps, changes since the last upload, fill empty slots, CRIT from artifacts, reorder, your own title, constellation pips, weapon passive, several showcases, teams of four with elemental resonance (hand-written, since genshin-db has none), and Share; real data from the two sample exports; 1,512 combinations checked with no overflow or console errors. The user picked the first ten (2026-11-11); teams of four and Share are left out for now
   - [x] Dropping a card on another swaps the two instead of shifting the ones between (the user's request after the test build, 2026-11-11; `swapSlots` with a unit test; the arrows still move one place)
   - [x] Set bonus badges open their bonus text, like the weapon's passive (the user's request after trying it, 2026-11-11; checked on /features' sample: Blizzard Strayer's 2-piece and 4-piece text)
   - [x] The ten built (2026-11-11): `Showcase.tsx` (tabs for up to five named showcases saved as `showcases`, rename, delete, Fill empty slots, moving slots by arrows or dragging), `ShowcaseSlot.tsx` (constellation dots, weapon passive popover loaded on demand, main stats, CRIT from artifacts, build gaps, changes since the last upload from the `previousBuilds` snapshot saved with each upload), logic in `showcaseBuild.ts` with 8 unit tests (62 in all pass); lint and type check pass; the showcase e2e test extended (not run)
   - [x] Checked on `dev:emu` with `copytest` (2026-11-11): renamed to "Main team" (focus back on the pencil); a new showcase filled by Total CV with Skirk, Yoimiya, Mavuika, Ganyu and Razor (as the mockup); Skirk moved right twice by mouse and Enter with focus kept, and Razor dragged to slot 1; both showcases kept after a reload and read back from Firestore; deleting one asked first and put focus on the remaining tab; the weapon passive (Rust at R5, 80%) opened; after uploading the 2024 sample and then the 2026 one, Chevreuse showed Level 1 → 80, C1 → C6, Skill 1 → 8, a new weapon and Total CV +99.5; light and dark at phone width with no sideways scroll; /features' sample works without links; no console errors after a clean dev server start
2. **Featured build card**
   - [x] Mockup (`.mockups/build-card.html`, 2026-11-11) covering where it sits (A a dialog from the character page, B slot 1 featured on the overview, C both), the layout (three columns or stacked), the "from artifacts" totals and whether to offer Save as image (html-to-image, MIT); Furina, Yoimiya and Bennett from the Irminsul sample; 432 combinations checked with no overflow or console errors
   - [x] The user has picked an option for every choice: **C** both places, **three columns**, the **from artifacts** totals and **Save as image** (2026-11-11)
   - [x] Built, with any new library credited in the README (2026-11-11: `BuildCard.tsx`, the Featured card in `Showcase.tsx` loaded with `next/dynamic`, the character page's Build card dialog, `artifactTotals` and `mainStatValue` with unit tests (65 pass), `ArtifactSlotCard`'s `showMainValue`; html-to-image 1.11.13 (MIT) credited; e2e checks for Featured and the dialog added, not run)
   - [x] Checked on `dev:emu` in light, dark and phone width, with a fully built character, one with missing pieces and the Traveler (2026-11-11: the home page sample's Featured Ganyu, `copytest`'s Featured Skirk and Furina's dialog with Total CV 143.1 matching the showcase; the PNG came out right after two fixes, `includeQueryParams` and an image `Accept` header, checked by showing it on the page without downloading; no sideways scroll at 375 px.; Lynette's card shows "No flower" and "No plume"; the Traveler's, with no element picked, has the indigo strip and talents without names)
3. **Upload changes**
   - [x] Logic in `src/lib/genshin/` with unit tests: added characters and weapons, level, constellation and talent changes, artifact counts; nothing listed when the same file is uploaded twice (2026-11-11: `uploadChanges.ts` reuses `buildChanges`, counts weapons by key both ways, and matches artifacts by set, slot, rarity and main stat, first to an identical piece and then to one it could have been leveled into, since GOOD has no artifact ids; the Traveler matches whatever the export calls it; 8 unit tests, 74 in all pass; on the 2024 → 2026 samples: 18 new characters, 58 changed, 110 new weapons, 1,312 new artifacts and 60 gone)
   - [x] Mockup (`.mockups/upload-changes.html`, 2026-11-11: where A in the Saved message / B a panel below it / C a dialog, portraits or a text list, Total CV changes and used-up weapons shown or left out, the real sample upload, the same file twice and a first upload; 288 combinations checked with no overflow) and the user's pick: **B** a panel below the Saved message, **with portraits**, Total CV changes and used-up weapons both shown (2026-11-11)
   - [x] Built and checked on `dev:emu` by uploading the test export, then a changed copy (2026-11-11: `UploadChanges.tsx`, wired into the overview's upload; with `copytest`, the 2024 sample then the 2026 one showed 18 new, 58 changed, 110 new weapons and 1,312 new artifacts as the unit test does, Chevreuse's Level 1 → 80, Show all listing all 58; the same file twice said "Nothing changed since your last upload" with no panel; 2026 → 2024 also worked; light, dark and 375 px with no sideways scroll; closing moves focus to the page's main area and a reload clears it; no console errors; e2e test "a second upload lists what changed, once" added, not run)
4. **Material planner**
   - [x] `npm run data:genshin` writes the cost data; for a few characters and weapons the totals match genshin-db and the game (2026-11-11: `src/data/genshin/materialCosts.json`, 157 KB, each material listed once and referred to by number; 124 characters, the Traveler's talents for 7 elements, 254 weapons; no talent costs for the Wonderland Manekin. Checked: Furina and Bennett ascension 420,000 Mora, gems 1/9/9/6, 46 boss, 168 local specialty, common 18/30/36; one talent 1→10 1,652,500 Mora, books 3/21/38, common 6/22/31, 6 weekly boss, 1 Crown; Splendor of Tranquil Waters and Skyward Harp 225,000 Mora, 5/14/14/6, 23/27/41, 15/23/27; Favonius Sword 150,000 Mora. Irminsul exports leave out Mora (Inventory Kamera's include it), and genshin-db has no EXP tables, so EXP books, ore and leveling Mora aren't in this file)
   - [x] Planner logic with unit tests (have, need and missing per material, for level and talent targets) (2026-11-11: `materialPlanner.ts`, `planCharacter` and `planWeapon`; the user chose to count leveling too, so it holds the game's EXP per level (character 1→90 8,362,650; weapons 5★ 9,064,450, 4★ 6,042,650, 3★ 3,988,200, 2★ and 1★ to 70) from Snap.Hutao by DGP Studio (MIT, credited), books and ore valued from genshin-db's descriptions; 13 unit tests, 87 in all pass, including a full 5★ build to 90 and 10/10/10: 7,050,030 Mora and 419 Hero's Wit, and a 5★ weapon to 90: 1,131,445 Mora and 907 Mystic Enhancement Ore)
   - [x] Mockup (`.mockups/planner.html`, 2026-11-11: where A on the character page / B a Planner tab with saved plans and a total / C both, a table or progress bars, covered materials listed or folded away; real plans from the 2026 sample; 96 combinations checked with no overflow) and the user's pick: **C** both, with a **switch between the table and bars**, and covered materials **folded away** (2026-11-11)
   - [x] Built and checked on `dev:emu` in light, dark and phone width; no raw material keys shown (2026-11-11: `CharacterPlan.tsx`, `WeaponPlan.tsx`, `PlanTargets.tsx`, `MaterialList.tsx`, `WeaponPicker.tsx`, `/genshin/planner`, plans saved as `plans` on the Genshin document, no rules change needed; 4 more unit tests, 91 in all pass. With `copytest`: Chevreuse 80 → 90 with Skill 8 → 9 and Burst 1 → 9 showed the mockup's numbers (Fontemer Unihorn 20 / 3 / 17, EXP covered by the books, Mora not in the export); Add to planner, then "In your planner"; on the tab, Thrilling Tales of Dragon Slayers (Citlali's, by typing "thrilling citlali" and Enter) and Furina added through the dialog; the total added them up (Philosophies of Justice 32 / 2 / 30); kept after a reload and read back from Firestore; Edit, Remove, Escape and Cancel put focus back; the Bars choice carried over to the character page; Favonius Sword's page offered Kazuha's, the Traveler's and the unequipped copy and started on the unequipped Lv 1; plans kept through a new upload; signed out, the tab shows the log-in banner; light, dark, 375 px and 768 px with no sideways scroll (two fixes on the way: the table's screen-reader labels widened the page, and on phones the Have column now steps aside so Missing stays in view); the constellation buttons on character pages, too wide at 375 px since the C0 button, are narrower on phones; names only from genshin-db or the cost file, no raw keys; no console errors)
   - [x] Material icons (the user's request after trying it, 2026-11-11): `npm run icons:materials` downloads all 521 (Enka.Network, then Project Amber; credited); mockup `.mockups/material-icons.html` (none / 24 / 32 px, rarity color / soft grey / nothing, table and bars; 72 combinations checked), the user picked **32 px on the rarity color**; checked on `dev:emu` in the table and bars, light and dark, 375 px with no sideways scroll, every icon loaded and none fell back to the placeholder
5. **Wish history additions**
   - [x] Primogem estimate and 50/50 record, with unit tests, matching the user's paimon.moe numbers (2026-11-12: `wishSpending` (160 a fate; a Beginners' Wish ten-pull costs 8) and `fiftyFiftyRecord` (guaranteed 5★s left out of the rate) in `wishes.ts`, 2 unit tests, 95 in all pass. On the user's paimon.moe file: 4,752 wishes, about 760,320 Primogems (Character Event 3,320 / 531,200, Weapon Event 626 / 100,160, Standard 806 / 128,960); 50/50s 18 won, 16 lost (53%), 16 guaranteed. the user confirmed paimon.moe shows the same, 2026-11-12)
   - [x] UIGF v4 download, with unit tests; importing the downloaded file back adds 0 wishes (2026-11-12: `toUigf` writes UIGF v4.2 (uigf.org, updated 2026-01-29) with `uigf_gacha_type` 400 filed under 301 and `timezone` from the UID's server (`uigfTimezone`: 6 → −5, 7 → +1, others +8); paimon.moe pulls keep their 13-digit ids so they match on the way back; 2 unit tests; the user's own 4,752-wish file goes out and back through `parseUigfText` identical, no warnings, 0 added)
   - [x] Mockup and the user's pick (`.mockups/wish-additions.html`, 2026-11-12: 1 where Primogems and the 50/50 record go (A in the tiles / B a summary line / C its own panel), 2 where Download goes (A the import bar / B a "Keep a copy" section), 3 what to do with no UID saved, since paimon.moe files have none and UIGF needs one (A ask each time / B ask once and save it); with the user's real numbers; 288 combinations checked with no overflow or errors). The user picked **1A 2A 3A** (2026-11-12)
   - [x] Built and checked on `dev:emu` (2026-11-12: `WishStats.tsx` (Wishes tile "≈ N Primogems" in place of the last date, won / lost chips and the rate beside Next 5★), `DownloadDialog` in the Wishes page, `UploadBar`'s new `actions` slot. With `copytest`: 181,920 Primogems on Character Event, 5 won and 6 lost (45%); Download showed UID 800000001 and saved `gacha-savior-wishes-800000001-2026-11-12.json` (1,781 wishes, v4.2, timezone 8), which imported back as "No new wishes: all 1,781 ...". With a throwaway account (deleted afterwards) holding only the paimon.moe test file: no UID shown, the dialog put focus on "Your UID", refused empty and 5 digits with the error line, took 123456789, saved 1,253 wishes, left the account's UID unset, and the file imported back with no new wishes. Escape and Download put focus back on the Download button. Light, dark and 375 px with no sideways scroll; no console errors from the page. The signed-out sample shows the Primogems and 50/50 chips but no Download. e2e: the signed-out test checks the new text and a new test downloads and re-imports; not run)
6. **Tests and docs**
   - [x] `npm test`, lint, `npx tsc --noEmit` and `npm run build` pass (2026-11-12, after step 5: 95 unit tests, lint, type check and build all clean)
   - [x] E2E specs updated for the new pieces, run when the user asks (2026-11-12: the full run had 61 pass and 4 fail, 11 not run. Fixed: a real accessibility bug, the showcase's New showcase button sat inside the tablist (axe `aria-required-children`), so the tabs now have their own tablist beside it; the weapon page test now counts only the copies table, since the Plan section added a table; the upload changes test opens Show all before looking for Chevreuse, who is past the first eight. The three spec files then ran again: 48 of 48 pass, so all 76 tests have passed)
   - [x] `docs/ARCHITECTURE.md`, `CLAUDE.md`, the home page feature cards and the README credits describe what was built; this phase is marked done once step 7 ships (2026-11-12: ARCHITECTURE covers every Phase 6 module and component, CLAUDE.md's section list now names the showcase, build card, upload changes, planner and wish additions, README credits html-to-image, Snap.Hutao's EXP tables and the material icon sources; the feature cards mockup `.mockups/feature-cards.html` (A four across / B merge the two character cards / C More games soon spans two; 18 combinations, no overflow); the user picked **B**, built in `GenshinFeatures.tsx`: Characters, Weapons, Artifacts, Team showcase (now with Save as image), Material planner and Wish history in rows of three, and More games soon as a dashed strip; checked on /features in dark at desktop width and light at 375 px, no sideways scroll or console errors)
7. **Release** (only when the user asks)
   - [ ] Security audit with Cloudflare's [security-audit-skill](https://github.com/cloudflare/security-audit-skill) (MIT), installed for this project only once steps 1–6 are done; the findings go to the user before anything is fixed (the user's choice, 2026-11-11)
   - [ ] `package.json`'s version set to 1.1.0 (the UIGF download writes it as `export_app_version`)
   - [ ] Test build served on localhost for the user to check
   - [ ] Committed, tagged `v1.1.0`, deployed, and the live pages checked

---

## Later

Ideas that came up but aren't scheduled yet:

- **More unit tests.** `parseGood`, CV scoring, the stat helpers and Phase 5's wish logic (UIGF and paimon.moe reading, merging, pity, storage chunks) are covered by `npm test`. Other pure helpers could follow. These are the parts where a silent bug gives users wrong numbers.
- **Per-character artifact scoring**: weighting substats by what each character wants, shown next to CV.
- **Honkai: Star Rail and Zenless Zone Zero**, using the `games/{gameId}` structure from Phase 1.
- **Public profiles**: a shareable read-only page for a user's showcase.

## Open questions

1. **Tracking project progress.** Should these phases become GitHub issues once the new repo exists, or stay in this document?
