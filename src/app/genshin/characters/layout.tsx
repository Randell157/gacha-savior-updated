import type { Metadata } from "next";

// The template is repeated here because a plain title would stop
// /genshin/characters/[key] from inheriting the one in genshin/layout.tsx.
export const metadata: Metadata = {
  title: { default: "Characters", template: "%s · Genshin · Gacha Savior" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
