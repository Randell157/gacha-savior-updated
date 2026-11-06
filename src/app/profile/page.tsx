"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useGenshinData } from "@/hooks/useGenshinData";
import { Button } from "@/components/ui/button";
import PageShell from "@/components/PageShell";
import RequireAuth from "@/components/RequireAuth";
import ChangePassword from "@/components/ChangePassword";
import ChangePicture from "@/components/ChangePicture";
import ChangeUsername from "@/components/ChangeUsername";
import DeleteData from "@/components/DeleteData";
import { DetailRow, DetailRows } from "@/components/DetailRows";
import { formatUploadTime } from "@/lib/utils";

export default function ProfilePage() {
  return (
    <RequireAuth skeleton="rows">
      <Profile />
    </RequireAuth>
  );
}

function Profile() {
  const { user, createdAt } = useAuth();
  const { lastUploadedAt } = useGenshinData();
  const joined = createdAt ? new Date(createdAt) : null;

  return (
    <PageShell title="Profile" panel="none">
      {/* Same width and margins as PageShell's own panel, with Delete data as a panel of its own. */}
      <div className="mx-auto max-w-7xl space-y-6 py-4 sm:px-6 sm:py-12 lg:px-8">
      <div className="overflow-hidden bg-white shadow dark:bg-slate-900 sm:rounded-lg">
      <DetailRows>
        <DetailRow label="Picture">
          <ChangePicture />
        </DetailRow>
        <DetailRow label="Username">
          <ChangeUsername />
        </DetailRow>
        <DetailRow label="Email">{user?.email ?? "—"}</DetailRow>
        <DetailRow label="Joined">
          {joined && !Number.isNaN(joined.getTime())
            ? joined.toLocaleDateString(undefined, { dateStyle: "medium" })
            : "—"}
        </DetailRow>
        <DetailRow label="Password">
          <ChangePassword />
        </DetailRow>
        <DetailRow label="Last upload">
          <span className="flex flex-wrap items-baseline gap-x-4">
            <span>{lastUploadedAt ? formatUploadTime(lastUploadedAt) : "Nothing uploaded yet"}</span>
            {/* The negative margin keeps a 44 px tap area without making the row taller. */}
            <Link
              href="/genshin"
              className="-my-3 inline-flex min-h-11 items-center font-medium text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
            >
              {lastUploadedAt ? "Upload new export" : "Upload your first export"}
            </Link>
          </span>
        </DetailRow>
      </DetailRows>
      <div className="px-4 py-5 sm:px-6 border-t border-gray-200 dark:border-slate-700">
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to your games</Link>
        </Button>
      </div>
      </div>
      <DeleteData />
      </div>
    </PageShell>
  );
}
