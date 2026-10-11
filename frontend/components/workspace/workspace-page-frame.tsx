"use client";

import type { ReactNode } from "react";

import { AppShell } from "@/components/workspace/app-shell";
import { PageSkeleton } from "@/components/workspace/page-skeleton";
import { useWorkspace } from "@/lib/workspace-context";

interface WorkspacePageFrameProps {
  children: ReactNode;
  loading?: boolean;
  skeleton?: ReactNode;
}

/**
 * Renders the workspace chrome immediately and keeps content transitions
 * inside the shell instead of blocking the whole UI on each tab change.
 */
export function WorkspacePageFrame({
  children,
  loading = false,
  skeleton,
}: WorkspacePageFrameProps) {
  const {
    authLoading,
    isAuthenticated,
    workspaceLoading,
  } = useWorkspace();

  const showSkeleton =
    authLoading ||
    !isAuthenticated ||
    workspaceLoading ||
    loading;

  return (
    <AppShell>
      {showSkeleton
        ? skeleton ?? <PageSkeleton />
        : children}
    </AppShell>
  );
}
