"use client";

import type { ReactNode } from "react";

import { WorkspaceAuthGate } from "@/components/workspace/workspace-auth-gate";
import { WorkspaceProvider } from "@/lib/workspace-context";

export function WorkspaceShell({ children }: { children: ReactNode }) {
  return (
    <WorkspaceProvider>
      <WorkspaceAuthGate>{children}</WorkspaceAuthGate>
    </WorkspaceProvider>
  );
}
