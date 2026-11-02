# Gacha Savior App

This is my final CAPSTONE project for Computer Science!

This is a website that allows people to track and organize their information for various gacha games, starting with Genshin Impact! Will update to have more in the future!

Using Vercel to host the website for now: https://gachasavior.vercel.app/

## Development

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and fill in the Firebase values. The same variables need to be set in Vercel.
3. Start the dev server: `npm run dev`, then open http://localhost:3000

Other commands: `npm run build`, `npm run lint`

To use the site, export your Genshin account as a GOOD-format JSON file with [Inventory Kamera](https://github.com/Andrewthe13th/Inventory_Kamera) or Irminsul, then upload it on the dashboard. Sample exports are in `public/sample-data/inventory-kamera/`.

Built with Next.js, React, TypeScript, Tailwind CSS and Firebase (Auth + Firestore). See `docs/DESIGN.md` for the roadmap.

Using shadcn/ui component library with Lucide React Icons

Genshin Impact Character Portraits via https://genshin-impact.fandom.com/wiki/Character/Gallery

All characters belong to Hoyoverse