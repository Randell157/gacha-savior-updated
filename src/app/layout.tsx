import { Metadata } from "next";
import { AuthProvider } from "@/contexts/AuthContext";
import { GenshinDataProvider } from "@/contexts/GenshinDataContext";
import { WishDataProvider } from "@/contexts/WishDataContext";
import { ThemeProvider } from "@/components/ThemeControls";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  // Pages are client components, so each route's title comes from a small
  // layout.tsx next to its page.tsx.
  title: { default: "Gacha Savior", template: "%s · Gacha Savior" },
  description: "Gacha Savior Website",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // next-themes sets the theme class on <html> before React hydrates.
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            <GenshinDataProvider><WishDataProvider>{children}</WishDataProvider></GenshinDataProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
