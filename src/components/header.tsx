"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { GAMES, useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { ChevronDown, LogOut, Menu, Check, User } from "lucide-react";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/features", label: "Features" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Header() {
  const { user, username, loading } = useAuth();
  const { selectedGameId, setSelectedGameId } = useGame();
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
    <header className="px-4 lg:px-6 h-14 flex items-center justify-center border-b border-border/40 bg-white">
      <div className="container flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 -ml-2 text-indigo-900 hover:bg-indigo-50"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(100%,20rem)] sm:max-w-sm">
              {/* On phones the page links live here instead of the top bar. */}
              <nav className="sm:hidden mb-6 border-b pb-4 flex flex-col gap-1" aria-label="Pages">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-900 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <SheetHeader>
                <SheetTitle className="text-indigo-900">Games</SheetTitle>
                <SheetDescription>
                  Select a game to organize. More titles will be supported over
                  time.
                </SheetDescription>
              </SheetHeader>
              <nav className="mt-8 flex flex-col gap-1" aria-label="Game selection">
                {GAMES.map((game) => {
                  const isSelected = game.id === selectedGameId;
                  return (
                    <button
                      key={game.id}
                      type="button"
                      onClick={() => {
                        setSelectedGameId(game.id);
                        setMenuOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors",
                        "hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                        isSelected && "bg-indigo-100/80 ring-1 ring-indigo-200"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                          isSelected
                            ? "border-indigo-600 bg-indigo-600 text-white"
                            : "border-muted-foreground/30"
                        )}
                        aria-hidden
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-medium text-gray-900">
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
            className="flex items-center justify-center font-bold truncate"
            href={user ? "/dashboard" : "/"}
          >
            Gacha Savior
          </Link>
        </div>
        <nav className="flex items-center gap-4 sm:gap-6 shrink-0">
          {NAV_LINKS.map((link) => (
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
              className="h-4 w-16 rounded bg-gray-200 animate-pulse"
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
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/profile">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              className="text-sm font-medium hover:underline underline-offset-4"
              href="/login"
            >
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
