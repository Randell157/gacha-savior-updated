import type { Metadata } from "next";

// Pages under /genshin get "<Page> · Genshin · Gacha Savior".
export const metadata: Metadata = {
  title: { default: "Overview · Genshin", template: "%s · Genshin · Gacha Savior" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
