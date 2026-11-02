import type { Metadata } from "next";

export const metadata: Metadata = { title: "Artifacts" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
