import type { Metadata } from "next";
import type { ReactNode } from "react";

import { WorkspaceShell } from "@/components/workspace/workspace-shell";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Workspace",
};

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
