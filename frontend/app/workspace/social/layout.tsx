"use client";

import type { ReactNode } from "react";

import { AppShell } from "@/components/workspace/app-shell";
import { WorkspaceSectionNav } from "@/components/workspace/workspace-section-nav";

const TABS = [
  { href: "/workspace/social", label: "Post", exact: true },
  { href: "/workspace/social/channels", label: "Connect" },
  { href: "/workspace/social/studio", label: "Create" },
  { href: "/workspace/social/calendar", label: "Calendar" },
] as const;

export default function SocialLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <div className="flex min-h-0 flex-1 flex-col">
        <WorkspaceSectionNav
          ariaLabel="Post sections"
          tabs={TABS}
        />
        <div className="flex-1 overflow-y-auto bg-kova-background">
          {children}
        </div>
      </div>
    </AppShell>
  );
}
