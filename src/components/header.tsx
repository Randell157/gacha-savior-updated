"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { GAMES, gameForPath } from "@/lib/games";
import GameIcon from "@/components/GameIcon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import Logo from "@/components/Logo";
import { ThemeChoice, ThemeCycleButton } from "@/components/ThemeControls";
import { ChevronDown, LogOut, Menu, Check, User } from "lucide-react";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/features", label: "Features" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Header() {
  const { user, username, loading } = useAuth();
  // Signed out, the features live on the home page; signed in, the home page
  // redirects to the hub, so the link keeps its own page.
  const navLinks = user
    ? NAV_LINKS
    : NAV_LINKS.map((link) => (link.href === "/features" ? { ...link, href: "/#features" } : link));
  // The picker highlights the game whose section you're in; none on the hub.
  const currentGame = gameForPath(usePathname());
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  return (
    <header className="px-4 lg:px-6 h-14 flex items-center justify-center border-b border-border/40 bg-white dark:bg-slate-900">
      <div className="container flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 -ml-2 text-indigo-900 dark:text-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/40"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(100%,20rem)] sm:max-w-sm">
              {/* On phones the page links live here instead of the top bar. */}
              <nav className="sm:hidden mb-6 border-b pb-4 flex flex-col gap-1" aria-label="Pages">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-900 dark:text-slate-100 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <SheetHeader>
                <SheetTitle className="text-indigo-900 dark:text-indigo-200">Games</SheetTitle>
                <SheetDescription>
                  Select a game to organize. More titles will be supported over
                  time.
                </SheetDescription>
              </SheetHeader>
              <nav className="mt-8 flex flex-col gap-1" aria-label="Game selection">
                {GAMES.map((game) => {
                  const isSelected = game.id === currentGame?.id;
                  // Games without a section yet are shown but can't be picked.
                  const available = Boolean(game.href);
                  return (
                    <button
                      key={game.id}
                      type="button"
                      disabled={!available}
                      onClick={() => {
                        if (!game.href) return;
                        setMenuOpen(false);
                        router.push(game.href);
                      }}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                        available
                          ? "hover:bg-indigo-50 dark:hover:bg-indigo-900/40"
                          : "cursor-not-allowed opacity-60",
                        isSelected && "bg-indigo-100/80 dark:bg-indigo-900/50 ring-1 ring-indigo-200 dark:ring-indigo-800"
                      )}
                    >
                      <span className="relative shrink-0">
                        <GameIcon game={game} size={40} className={cn(!available && "grayscale")} />
                        {isSelected && (
                          <span
                            className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-white ring-2 ring-white dark:ring-slate-950"
                            aria-hidden
                          >
                            <Check className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 self-center">
                        <span className="block font-medium text-gray-900 dark:text-slate-100">
                          {game.name}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {game.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>
          <Link
            className="flex items-center gap-2 font-bold min-w-0"
            href={user ? "/dashboard" : "/"}
          >
            <Logo />
            <span className="truncate">Gacha Savior</span>
          </Link>
        </div>
        <nav className="flex items-center gap-4 sm:gap-6 shrink-0">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              className="hidden sm:inline text-sm font-medium hover:underline underline-offset-4"
              href={link.href}
            >
              {link.label}
            </Link>
          ))}
          {loading ? (
            <span
              className="h-4 w-16 rounded bg-gray-200 dark:bg-slate-700 animate-pulse"
              aria-label="Loading account"
            />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="text-sm font-medium gap-1.5 px-2"
                >
                  {username || user.email || "Account"}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/profile">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="pb-1 text-xs text-muted-foreground">
                  Theme
                </DropdownMenuLabel>
                <div className="px-2 pb-2">
                  <ThemeChoice />
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:text-red-400 dark:focus:bg-red-950"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <ThemeCycleButton />
              <Link
                className="text-sm font-medium hover:underline underline-offset-4"
                href="/login"
              >
                Login
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
