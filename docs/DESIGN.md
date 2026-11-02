# Gacha Savior: Roadmap and Design

Status: draft · Last updated: 2026-11-01

This document describes what comes next for Gacha Savior and how each piece will be built. For how the app works today, see [CLAUDE.md](../CLAUDE.md).

## Goals

1. **Data follows the account.** An upload made on one device shows up on every device the user logs in from.
2. **Genshin goes deeper.** The app moves from showing totals to answering real questions: which artifacts are good, what a character is wearing and how strong their kit is, and how close the user is to pity.
3. **A codebase that can grow.** One shared data layer and working lint, so new features and new games don't keep copying the same code.
4. **Keep the current look.** New pages and features use the same visual style the site has today, or one very close to it (see [UI style](#ui-style)). This plan doesn't include a redesign.

### Not in scope (for now)

- Honkai: Star Rail and Zenless Zone Zero. The game picker stays, but those games wait until the Genshin work below is done. Phase 1 keeps the data model game-aware so adding them later doesn't need a rewrite.
- Automated tests. They were left out of this plan on purpose; they're listed under [Later](#later) as a candidate.
- Pulling wish history straight from the game's URL, and per-character artifact scoring. Both were considered and set aside (see [Decisions](#decisions)).

## Decisions

| Question | Decision | Why |
|---|---|---|
| Where uploaded data lives | Firestore, under the user's account | Works across devices and survives clearing the browser. |
| Next focus | Deepen Genshin before adding games | Finish one game well first. |
| Genshin features | Artifact analysis, detail pages, wish history tracker | Chosen. A material planner was considered and not included. |
| Wish history source | UIGF JSON file import | The standard export format used by paimon.moe, Snap Hutao and others. It works the same way as the existing GOOD upload and needs no server. |
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
- **Small improvements are fine:** better spacing, mobile layouts, loading states and empty states, as long as the overall look stays the same.

If a phase needs a pattern the site doesn't have yet, build it from these same pieces. Any bigger visual change is for the user to decide; don't make it as part of a phase.

## Roadmap

Each phase builds on the one before it. Phase 2 comes first so later phases build on a consistent UI. Phases 3, 4 and 5 depend on Phase 1 but not on each other, so their order can change.

| Phase | Work | Depends on | Status |
|---|---|---|---|
| 0 | Groundwork: lint, shared types and parsing, env config, sign-up fix | — | **Done** (2026-11-01) |
| 1 | Firestore storage and one shared data hook | 0 | **Done** (2026-11-02) |
| 2 | UI review and consistency pass | 1 | **Done** (2026-11-02); still open for a few more UI changes the user is considering. Don't start Phase 3 until the user says so |
| 3 | Artifact analysis | 1 | Planned |
| 4 | Character and weapon detail pages | 1 | Planned |
| 5 | Wish history tracker | 1 | Planned |

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
> 1. ~~Deploy `firestore.rules`~~ **Done 2026-11-01**: pasted into the console. The CLI's logged-in account (randell.justin.lapid@gmail.com) has no access to the project, so `firebase deploy` fails with 403 until the CLI logs in as the project owner. Verified: signed-out reads return 403 on every path, and a real login (zach) moved its localStorage upload into `users/{uid}/games/genshin`.
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
users/{uid}/games/genshin/wishes/...     Phase 5
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

The tiers live in `src/lib/genshin/artifactScore.ts` so they're easy to adjust. Pieces below level 20 show their CV with a "still levelling" badge, because they're still gaining substats.

### Page features

- A grid of cards showing the set, slot, main stat, substats with readable names (`critDMG_` becomes "CRIT DMG%"), level, rarity, CV with its tier colour, and who has it equipped.
- Filters for set, slot, main stat, rarity, equipped or unequipped, and locked or unlocked. Sorting by CV, level or set.
- A summary strip: the average CV of equipped artifacts, and how many unequipped level-20 pieces are below 20 CV (likely fodder).
- Readable stat names come from the `STAT_LABELS` map added in Phase 2 (`src/lib/genshin/stats.ts`), which Phase 4 reuses too.
- Set icons: `public/artifact-icons/` is empty today. Fill it from the Phase 4 build script, or show the set name until then.
- Large inventories (1,700+ pieces): start with pagination at 60 per page. Add a virtualized list only if the page actually feels slow. **Already in place (2026-11-02):** the page opens on equipped pieces grouped by character, and All / Unequipped load 60 at a time. Phase 3's filters and sorting should build on that toggle rather than replace it.

**Done when** the user can find their weakest unequipped pieces and best pieces in a few clicks, and every character's equipped artifacts show a CV.

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

- Header: portrait, name, element and weapon icons, rarity, level, ascension and constellation.
- **Talents**: the user's Normal Attack, Skill and Burst levels from the GOOD `talent` field, with names and descriptions from the game data.
- **Constellations**: all six, with the unlocked ones highlighted.
- **Equipped gear**: the weapon card linking to its page, and the five artifacts with their Phase 3 CV, plus active set bonuses (2-piece and 4-piece).
- **Stats**: base HP, ATK and DEF at the character's level. Full final stats with every bonus included would need a complete damage calculator, so that's out of scope; the page says "Base stats" clearly.

### Weapon page (`/genshin/weapons/[key]`)

A new route. It shows base ATK and the substat at its level, the passive at the user's refinement, and who has it equipped. It also lists other copies the user owns, since `/weapons` can show duplicates.

**Done when** every owned character and weapon has a full page, and the build script runs without unmatched keys apart from known ones.

---

## Phase 5: Wish history tracker

### Import

- A new route, `/genshin/wishes`, with a UIGF JSON upload. Support **UIGF v4** (the `hk4e: [{ uid, list }]` layout) first, and accept **v3** (`info` and `list`). Reject other games' sections with a clear message.
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

---

## Later

Ideas that came up but aren't scheduled yet:

- **Automated tests**, starting with the pure logic: `parseGood`, CV scoring, UIGF merging and pity counting. These are the parts where a silent bug gives users wrong numbers.
- **Material planner**: what a character or weapon still needs to reach a target level, using the uploaded `materials`.
- **Per-character artifact scoring**: weighting substats by what each character wants, shown next to CV.
- **Honkai: Star Rail and Zenless Zone Zero**, using the `games/{gameId}` structure from Phase 1.
- **Public profiles**: a shareable read-only page for a user's showcase.

## Open questions

1. **Tracking project progress.** Should these phases become GitHub issues once the new repo exists, or stay in this document?
