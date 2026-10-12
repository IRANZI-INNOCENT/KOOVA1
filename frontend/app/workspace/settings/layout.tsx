"use client";

import { Suspense, type ReactNode } from "react";

import { AppShell } from "@/components/workspace/app-shell";

function SettingsLoading() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <p className="text-sm text-gray-500">Loading settings…</p>
    </div>
  );
}

export default function WorkspaceSettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AppShell>
      <Suspense fallback={<SettingsLoading />}>{children}</Suspense>
    </AppShell>
  );
}
