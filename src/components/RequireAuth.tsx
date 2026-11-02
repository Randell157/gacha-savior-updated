"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useGenshinData } from "@/hooks/useGenshinData";
import PageSkeleton, { type SkeletonKind } from "@/components/PageSkeleton";

/**
 * Wraps pages that need a signed-in user. Shows a loading skeleton shaped like
 * the page until auth and the user's saved data are ready, and sends
 * signed-out visitors to /login. Children only render once `useGenshinData()`
 * has finished loading.
 */
export default function RequireAuth({
  skeleton,
  children,
}: {
  /** Shape of the loading skeleton; defaults to a grid of cards */
  skeleton?: SkeletonKind;
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const { loading: dataLoading } = useGenshinData();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  if (authLoading || !user || dataLoading) {
    return <PageSkeleton kind={skeleton} />;
  }

  return <>{children}</>;
}
