import { Metadata } from "next";
import { AuthProvider } from "@/contexts/AuthContext";
import { GameProvider } from "@/contexts/GameContext";
import { GenshinDataProvider } from "@/contexts/GenshinDataContext";
import { ThemeProvider } from "@/components/ThemeControls";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Gacha Savior",
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
          <GameProvider>
            <AuthProvider>
              <GenshinDataProvider>{children}</GenshinDataProvider>
            </AuthProvider>
          </GameProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
