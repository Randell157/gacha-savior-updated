import type { Metadata } from "next";

// The template repeats the parent's, because a plain string title would stop [key] from inheriting it.
export const metadata: Metadata = {
  title: { default: "Weapons", template: "%s · Genshin · Gacha Savior" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
