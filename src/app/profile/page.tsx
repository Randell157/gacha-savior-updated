"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useGenshinData } from "@/hooks/useGenshinData";
import { Button } from "@/components/ui/button";
import PageShell from "@/components/PageShell";
import RequireAuth from "@/components/RequireAuth";
import { DetailRow, DetailRows } from "@/components/DetailRows";

export default function ProfilePage() {
  return (
    <RequireAuth skeleton="rows">
      <Profile />
    </RequireAuth>
  );
}

function Profile() {
  const { user, username, createdAt } = useAuth();
  const { lastUploadedAt } = useGenshinData();
  const joined = createdAt ? new Date(createdAt) : null;

  return (
    <PageShell title="Profile" panel="flush">
      <DetailRows>
        <DetailRow label="Username">{username ?? "—"}</DetailRow>
        <DetailRow label="Email">{user?.email ?? "—"}</DetailRow>
        <DetailRow label="Joined">
          {joined && !Number.isNaN(joined.getTime()) ? joined.toLocaleDateString() : "—"}
        </DetailRow>
        <DetailRow label="Last upload">
          {lastUploadedAt ? lastUploadedAt.toLocaleString() : "Nothing uploaded yet"}
        </DetailRow>
      </DetailRows>
      <div className="px-4 py-5 sm:px-6 border-t border-gray-200 dark:border-slate-700">
        <Button asChild>
          <Link href="/dashboard">Back to your games</Link>
        </Button>
      </div>
    </PageShell>
  );
}
