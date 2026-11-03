"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useGenshinData } from "@/hooks/useGenshinData";
import PageSkeleton, { type SkeletonKind } from "@/components/PageSkeleton";

/**
 * Wraps pages that need a signed-in user. Shows a loading skeleton shaped like
 * the page until auth and the user's saved data are ready, and sends
 * signed-out visitors to /login, unless the page passes `signedOut`, which is
 * shown to them instead. Children only render once `useGenshinData()` has
 * finished loading.
 */
export default function RequireAuth({
  skeleton,
  signedOut,
  children,
}: {
  /** Shape of the loading skeleton; defaults to a grid of cards */
  skeleton?: SkeletonKind;
  /** What signed-out visitors see instead of being sent to /login */
  signedOut?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const { loading: dataLoading } = useGenshinData();
  const router = useRouter();
  const redirect = !authLoading && !user && !signedOut;

  useEffect(() => {
    if (redirect) {
      router.replace("/login");
    }
  }, [redirect, router]);

  if (!authLoading && !user && signedOut) {
    return <>{signedOut}</>;
  }
  if (authLoading || !user || dataLoading) {
    return <PageSkeleton kind={skeleton} />;
  }

  return <>{children}</>;
}
