"use client";

import type { ReactNode } from "react";

import { AppShell } from "@/components/workspace/app-shell";
import { WorkspaceSectionNav } from "@/components/workspace/workspace-section-nav";

const PRIMARY_TABS = [
  { href: "/workspace/social", label: "Overview", exact: true },
  { href: "/workspace/social/channels", label: "Connect" },
  { href: "/workspace/social/studio", label: "Create" },
] as const;

const MORE_TABS = [
  { href: "/workspace/social/calendar", label: "Calendar" },
  { href: "/workspace/social/engagement", label: "Replies" },
  { href: "/workspace/social/autopilot", label: "Autopilot" },
] as const;

export default function SocialLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <div className="flex min-h-0 flex-1 flex-col">
        <WorkspaceSectionNav
          ariaLabel="Social sections"
          tabs={PRIMARY_TABS}
          moreTabs={MORE_TABS}
        />
        <div className="flex-1 overflow-y-auto bg-kova-background">
          {children}
        </div>
      </div>
    </AppShell>
  );
}
