"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useGenshinData } from "@/hooks/useGenshinData";
import { CenteredPage } from "@/components/PageShell";

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
    return <LoadingPage />;
  }

  return <>{children}</>;
}

/** The loading screen shown while auth or saved data is loading. */
export function LoadingPage() {
  return (
    <CenteredPage>
      <p className="text-gray-700">Loading your data...</p>
    </CenteredPage>
  );
}
