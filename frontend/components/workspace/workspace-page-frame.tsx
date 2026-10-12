"use client";

import type { ReactNode } from "react";

import { AppShell } from "@/components/workspace/app-shell";
import { PageSkeleton } from "@/components/workspace/page-skeleton";
import { useWorkspace } from "@/lib/workspace-context";

interface WorkspacePageFrameProps {
  children: ReactNode;
  loading?: boolean;
  skeleton?: ReactNode;
  /** LinkedIn-only flows do not require a commerce business record. */
  requireBusiness?: boolean;
  /** When the route layout already renders AppShell (e.g. LinkedIn). */
  embedded?: boolean;
}

/**
 * Renders the workspace chrome immediately and keeps content transitions
 * inside the shell instead of blocking the whole UI on each tab change.
 */
export function WorkspacePageFrame({
  children,
  loading = false,
  skeleton,
  requireBusiness = true,
  embedded = false,
}: WorkspacePageFrameProps) {
  const {
    authLoading,
    isAuthenticated,
    workspaceLoading,
  } = useWorkspace();

  const showSkeleton =
    authLoading ||
    !isAuthenticated ||
    (requireBusiness && workspaceLoading) ||
    loading;

  const body = showSkeleton ? skeleton ?? <PageSkeleton /> : children;

  if (embedded) {
    return body;
  }

  return <AppShell>{body}</AppShell>;
}
