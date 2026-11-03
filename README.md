# Gacha Savior App

This is my final CAPSTONE project for Computer Science!

This is a website that allows people to track and organize their information for various gacha games, starting with Genshin Impact! Will update to have more in the future!

Using Vercel to host the website for now: https://gacha-savior-updated.vercel.app/

## Development

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and fill in the Firebase values. The same variables need to be set in Vercel.
3. Start the dev server: `npm run dev`, then open http://localhost:3000

Other commands: `npm run build`, `npm run lint`

To use the site, export your Genshin account as a GOOD-format JSON file with [Inventory Kamera](https://github.com/Andrewthe13th/Inventory_Kamera) or Irminsul, then upload it on the dashboard. Sample exports are in `public/sample-data/inventory-kamera/`.

Built with Next.js, React, TypeScript, Tailwind CSS and Firebase (Auth + Firestore). See `docs/DESIGN.md` for the roadmap.

## Credits

Gacha Savior is an unofficial fan project. It is not affiliated with or endorsed by HoYoverse.

### Game content

- **Genshin Impact, Honkai: Star Rail and Zenless Zone Zero** are trademarks of HoYoverse (COGNOSPHERE PTE. LTD. / miHoYo). All characters, names, artwork and in-game text belong to HoYoverse.
- **Character portraits** come from the [Genshin Impact Wiki character gallery](https://genshin-impact.fandom.com/wiki/Character/Gallery) on Fandom. The artwork itself is HoYoverse's.
- **Weapon and artifact icons** (`public/weapon-icons/`, `public/artifact-icons/`) are HoYoverse's, downloaded from [HoYoLAB](https://www.hoyolab.com/) via the links in genshin-db, and from [Enka.Network](https://enka.network/) for the few HoYoLAB no longer serves, with `npm run icons:weapons` and `npm run icons:artifacts`.
- **Game app icons** (`public/genshinappicon.png`, `starrailappicon.png`, `zzzappicon.png`) were cropped from the games' App Store listings. They are HoYoverse's.
- **Artifact set names, bonuses and release versions** come from [genshin-db](https://github.com/theBowja/genshin-db) by theBowja (MIT License), extracted with `npm run data:genshin`. Character rarities, titles, descriptions, talent names and other details, and weapon names, rarities, passives, descriptions and stat growth come from it too. The playstyle roles on character pages are the site's own picks, not game data. The underlying game text belongs to HoYoverse.

### Account exports

- Uploads use the **GOOD** (Genshin Open Object Description) format created by the [Genshin Optimizer](https://github.com/frzyc/genshin-optimizer) project.
- Exports come from [Inventory Kamera](https://github.com/Andrewthe13th/Inventory_Kamera) or Irminsul. The sample exports in `public/sample-data/` were made with them.

### Libraries and tools

- [Next.js](https://nextjs.org/), [React](https://react.dev/) and [Tailwind CSS](https://tailwindcss.com/): MIT
- [shadcn/ui](https://ui.shadcn.com/) components (MIT), built on [Radix UI](https://www.radix-ui.com/) (MIT) and [class-variance-authority](https://cva.style/) (Apache-2.0)
- [Lucide](https://lucide.dev/) icons: ISC
- [next-themes](https://github.com/pacocoursey/next-themes) for dark mode: MIT
- [Firebase](https://firebase.google.com/) client and Admin SDKs: Apache-2.0
- [Inter](https://rsms.me/inter/) typeface by Rasmus Andersson, via Google Fonts: SIL Open Font License 1.1
- [sharp](https://sharp.pixelplumbing.com/) by Lovell Fuller (Apache-2.0), used to crop the game icons and resize the weapon and artifact icons
- [Playwright](https://playwright.dev/) by Microsoft, for the end-to-end tests: Apache-2.0
- [axe-core](https://github.com/dequelabs/axe-core) and [@axe-core/playwright](https://github.com/dequelabs/axe-core-npm) by Deque Systems, for the accessibility tests: MPL-2.0
- Hosted on [Vercel](https://vercel.com/)