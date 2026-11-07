"use client";

import { Suspense, type ReactNode } from "react";

import { AppShell } from "@/components/workspace/app-shell";

function SettingsLoading() {
  return null;
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
