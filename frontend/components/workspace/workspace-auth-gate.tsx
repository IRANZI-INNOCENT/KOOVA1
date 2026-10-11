"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/workspace/app-shell";
import { PageSkeleton } from "@/components/workspace/page-skeleton";
import { useAuth } from "@/lib/auth-context";

/**
 * Waits for session restore before rendering workspace routes or sending
 * people to login. Avoids redirect races on refresh and tab changes.
 */
export function WorkspaceAuthGate({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuth();
  const redirectStarted = useRef(false);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (isAuthenticated) {
      redirectStarted.current = false;
      return;
    }

    if (redirectStarted.current) {
      return;
    }

    redirectStarted.current = true;
    router.replace("/login");
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <AppShell>
        <PageSkeleton />
      </AppShell>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
