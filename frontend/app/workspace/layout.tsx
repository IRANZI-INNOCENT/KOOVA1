"use client";

import type { ReactNode } from "react";

import { WorkspaceAuthGate } from "@/components/workspace/workspace-auth-gate";
import { WorkspaceProvider } from "@/lib/workspace-context";

export default function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <WorkspaceAuthGate>
      <WorkspaceProvider>{children}</WorkspaceProvider>
    </WorkspaceAuthGate>
  );
}
