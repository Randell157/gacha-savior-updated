import type { Metadata } from "next";
import { weaponName } from "@/lib/genshin/weapons";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  const { key } = await params;
  return { title: weaponName(decodeURIComponent(key)) };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
