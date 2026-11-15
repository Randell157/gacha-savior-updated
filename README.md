# Gacha Savior Updated

**Version 1.1.1** · [Live site](https://gacha-savior-updated.vercel.app/)

> **AI disclosure:** this project's work since the capstone was written with [Claude Code](https://claude.com/claude-code) using Claude Opus 5.5. See [AI-assisted development](#ai-assisted-development).

This is a personal project! Gacha Savior started as my Computer Science capstone, and I wanted to keep building on it, so I picked it back up and continued it with the help of Claude Code.

This is a website that allows people to track and organize their information for various gacha games, starting with Genshin Impact! Will update to have more in the future!

Using Vercel to host the website for now: https://gacha-savior-updated.vercel.app/

## Development

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and fill in the Firebase values. The same variables need to be set in Vercel.
3. Start the dev server: `npm run dev`, then open http://localhost:3000

Other commands: `npm run build`, `npm run lint`, `npm test` (unit tests)

To use the site, export your Genshin account as a GOOD-format JSON file with [Inventory Kamera](https://github.com/Randell157/Inventory_Kamera_Fork/releases/latest) or Irminsul, then upload it on the dashboard. Sample exports are in `public/sample-data/inventory-kamera/`.

Built with Next.js, React, TypeScript, Tailwind CSS and Firebase (Auth + Firestore). See `docs/DESIGN.md` for the roadmap.

## AI-assisted development

The work on this project since it was picked back up after the capstone, from the groundwork for version 1.0 on, was made with [Claude Code](https://claude.com/claude-code), Anthropic's AI coding tool, using the Claude Opus 5.5 model. Claude Code wrote the code, tests and documentation changes. I directed the work, chose the designs from mockups, and checked each change on a local test build before it was committed and deployed. Commits written this way carry a `Co-Authored-By: Claude` line.

The original capstone code, from before the project moved to Claude Code, is not covered by this note.

## Credits

Gacha Savior is an unofficial fan project. It is not affiliated with or endorsed by HoYoverse.

### Game content

- **Genshin Impact, Honkai: Star Rail and Zenless Zone Zero** are trademarks of HoYoverse (COGNOSPHERE PTE. LTD. / miHoYo). All characters, names, artwork and in-game text belong to HoYoverse.
- **Character portraits** come from the [Genshin Impact Wiki character gallery](https://genshin-impact.fandom.com/wiki/Character/Gallery) on Fandom, for Vodyanitsa from [HoYoWiki](https://wiki.hoyolab.com/) via the link in genshin-db, and for Vesna, Mitya and Valeriy from [Enka.Network](https://enka.network/). The artwork itself is HoYoverse's.
- **Character and weapon EXP per level** (`src/lib/genshin/materialPlanner.ts`) are the game's own numbers as written out in [Snap.Hutao](https://github.com/wangdage12/Snap.Hutao) by DGP Studio (MIT License).
- **Weapon and artifact icons** (`public/weapon-icons/`, `public/artifact-icons/`) are HoYoverse's, downloaded from [HoYoLAB](https://www.hoyolab.com/) via the links in genshin-db, and from [Enka.Network](https://enka.network/) for the few HoYoLAB no longer serves, with `npm run icons:weapons` and `npm run icons:artifacts`.
- **Material icons** (`public/material-icons/`) are HoYoverse's, downloaded with `npm run icons:materials` from [Enka.Network](https://enka.network/) and, for the ones it doesn't have, [Project Amber](https://gi.yatta.moe/), using the icon names and item IDs in genshin-db.
- **Game app icons** (`public/genshinappicon.png`, `starrailappicon.png`, `zzzappicon.png`) were cropped from the games' App Store listings. They are HoYoverse's.
- **Artifact set names, bonuses and release versions** come from [genshin-db](https://github.com/theBowja/genshin-db) by theBowja (MIT License), extracted with `npm run data:genshin`. Character rarities, titles, descriptions, birthdays, base stats, talent and constellation names and text, and other details, and weapon names, rarities, passives, descriptions and stat growth come from it too, as do the item IDs used to read wish history and the ascension and talent material costs the material planner counts. The playstyle roles on character pages are the site's own picks, not game data. So are the reactions on character pages, written in the site's own words with help from the character quick guides on [KQM (KeqingMains)](https://keqingmains.com/). The underlying game text belongs to HoYoverse.

### Account exports

- Uploads use the **GOOD** (Genshin Open Object Description) format created by the [Genshin Optimizer](https://github.com/frzyc/genshin-optimizer) project.
- Wish history imports use the [UIGF](https://uigf.org/) (Uniformed Interchangeable GachaLog Format) standard by UIGF-org (MIT License). The site also reads the Excel wish history export of [paimon.moe](https://paimon.moe/) by MadeBaruna ([source](https://github.com/MadeBaruna/paimon-moe), MIT License). The wish exports in `public/sample-data/test-account/` are made up, written by `npm run data:test-wishes`.
- Exports come from Inventory Kamera or Irminsul. Inventory Kamera was made by Andrewthe13th and contributors ([original repo](https://github.com/Andrewthe13th/Inventory_Kamera), MIT License); the original is no longer updated, so the site now points to [Randell157/Inventory_Kamera_Fork](https://github.com/Randell157/Inventory_Kamera_Fork) (MIT License), this project's own maintained fork. Its 1.5 releases support the current game and write GOOD version 3. That fork is based on taiwenlee's fork version 1.4.5 ([repo](https://github.com/taiwenlee/Inventory_Kamera), MIT License) and adapts the Cryo Traveler and material-count fixes from dmitry-shishkin's fork version 1.4.11 ([repo](https://github.com/dmitry-shishkin/Inventory_Kamera), MIT License). The sample exports in `public/sample-data/` were made with these tools (the 2024 Inventory Kamera sample with the original, version 1.3.16).

### Libraries and tools

- [Next.js](https://nextjs.org/), [React](https://react.dev/) and [Tailwind CSS](https://tailwindcss.com/): MIT
- [shadcn/ui](https://ui.shadcn.com/) components (MIT), built on [Radix UI](https://www.radix-ui.com/) (MIT) and [class-variance-authority](https://cva.style/) (Apache-2.0)
- [Lucide](https://lucide.dev/) icons: ISC
- The GitHub, LinkedIn, X and YouTube logos on the About and Contact pages are trademarks of their owners. The GitHub, LinkedIn and YouTube ones are Lucide icons; the X one is a copy of X's own logo, since Lucide only has the old Twitter bird.
- [next-themes](https://github.com/pacocoursey/next-themes) for dark mode: MIT
- [html-to-image](https://github.com/bubkoo/html-to-image) by bubkoo, for saving a build card as a PNG: MIT
- [Firebase](https://firebase.google.com/) client and Admin SDKs: Apache-2.0
- [Inter](https://rsms.me/inter/) typeface by Rasmus Andersson, via Google Fonts: SIL Open Font License 1.1
- [sharp](https://sharp.pixelplumbing.com/) by Lovell Fuller (Apache-2.0), used to crop the game icons and resize the weapon and artifact icons
- [Playwright](https://playwright.dev/) by Microsoft, for the end-to-end tests: Apache-2.0
- [axe-core](https://github.com/dequelabs/axe-core) and [@axe-core/playwright](https://github.com/dequelabs/axe-core-npm) by Deque Systems, for the accessibility tests: MPL-2.0
- Hosted on [Vercel](https://vercel.com/)