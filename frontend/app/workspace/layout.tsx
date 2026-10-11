"use client";

import type { ReactNode } from "react";

import { WorkspaceProvider } from "@/lib/workspace-context";

export default function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <WorkspaceProvider>{children}</WorkspaceProvider>
  );
}
