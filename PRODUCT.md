# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Invested gacha players who already take their accounts seriously and are willing to run a scanner to export them. They want to see and check their whole account in one place: which characters they own, what each one is wearing, and how far each is built. Genshin Impact is the only supported game today.

## Product Purpose

Gacha Savior is a website where players upload an export of their account, then browse and organize it. It started from the creator's own wish, as someone who plays many gacha games, for an easy way to organize and display account information such as characters, weapons, talent levels and artifacts. It is also the creator's Computer Science capstone project at CSUF.

Success has no fixed deadline or user target. The project grows as time allows.

## Positioning

One tidy home for your account: your roster, gear and builds organized and easy to browse, and saved to your account so they're there on any device. It is not a theorycrafting tool or a damage calculator, which is the ground neighbors like Genshin Optimizer cover.

## Operating Context

- Players make the export outside the site, with Inventory Kamera or Irminsul running alongside Genshin, which saves a GOOD format `.json` file.
- They upload that file on the Genshin overview and upload again when they want the site to catch up. Between uploads the data doesn't change.
- Inventories can be large: a sample export holds 1,717 artifacts.
- Signed-out visitors can look around: the home page has a sample account, and the Genshin pages show their signed-out versions.

## Capabilities and Constraints

**Today:** accounts with email or username login; upload and storage of GOOD exports; a "Your games" hub; and a Genshin section with an overview and team showcase, a filterable character roster, character pages, weapons and artifacts. Light, dark and system themes.

**Planned, in `docs/DESIGN.md`:** artifact analysis with Crit Value scoring, fuller character and weapon detail pages, and a wish history tracker. Honkai: Star Rail and Zenless Zone Zero are planned and appear as "Coming soon". The Genshin work comes first.

**Out of scope for now:** full final stats or damage calculation, pulling wish history straight from the game, and per-character artifact scoring.

**Constraints:**

- The Firebase project is on the free Spark plan, so usage has to stay within its limits.
- Data comes from uploaded files. The site doesn't connect to game accounts.
- Game data is a snapshot from `genshin-db`, updated by hand after a game patch. Playstyle roles and reactions are hand-written and need the user's input for new characters.

**Terms:** "Dashboard" means the "Your games" hub only, and `/genshin` is the "Genshin overview". Say "owned", not "obtained". "Log in" and "Log out" are two words for the action.

**Undecided:** when the planned games will arrive, and whether Phase 3 starts before more UI changes.

## Brand Commitments

- The name is Gacha Savior, with the "GS" monogram as its logo and favicon.
- The current look stays. New pages and features match it closely, and any redesign needs the user's approval first. The details are in the "UI style" section of `docs/DESIGN.md`.
- Gacha Savior is an unofficial fan project, not affiliated with or endorsed by HoYoverse. Game artwork, names and text belong to HoYoverse and are credited in `README.md`.
- Copy is plain and direct, in sentence case with American spelling. Error messages say what failed and what to do next, and technical details stay out of the page.

## Evidence on Hand

- Sample exports from both supported tools, in `public/sample-data/inventory-kamera/`.
- A made-up sample account that drives the home page demo, in `src/lib/genshin/sampleData.ts`.
- The creator's own story, on the About page.

There are no testimonials, user counts, press or endorsements. Don't invent any.

## Product Principles

1. **Organize before analyzing.** The first job is making the account easy to see and browse. Analysis should answer a player's question, not turn the site into a calculator.
2. **Respect the player's existing knowledge.** Users are invested players, so use in-game names and terms, and never show raw export keys.
3. **Be honest about what's real.** Planned games and features look planned, sample data is labeled as sample data, and hand-written picks are never presented as game data.
4. **Stay light to run.** The site needs no server work beyond username login, and it stays on the free plan.

## Accessibility & Inclusion

WCAG 2.1 AA is the standard, in both light and dark mode. Pages are checked with axe-core, and the rules are in `CLAUDE.md` under UI conventions.
