import type { Metadata } from "next";
import { formatCharacterDisplayName } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  const { key } = await params;
  return { title: formatCharacterDisplayName(decodeURIComponent(key)) };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
