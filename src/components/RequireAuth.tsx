"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useGenshinData } from "@/hooks/useGenshinData";
import Header from "@/components/header";
import Footer from "@/components/footer";

/**
 * Wraps pages that need a signed-in user. Shows a loading screen until auth
 * and the user's saved data are ready, and sends signed-out visitors to
 * /login. Children only render once `useGenshinData()` has finished loading.
 */
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { loading: dataLoading } = useGenshinData();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  if (authLoading || !user || dataLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 min-h-screen bg-gradient-to-b from-indigo-100 to-purple-100 flex items-center justify-center">
          <p className="text-gray-700">Loading your data...</p>
        </main>
        <Footer />
      </div>
    );
  }

  return <>{children}</>;
}
