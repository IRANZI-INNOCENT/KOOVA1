"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { LinkedInProfileGate } from "@/components/linkedin/linkedin-profile-gate";
import { AppShell } from "@/components/workspace/app-shell";

const tabs = [
  { href: "/workspace/linkedin", label: "Home" },
  { href: "/workspace/linkedin/topic-week", label: "Topic week" },
  { href: "/workspace/linkedin/event", label: "Event moment" },
  { href: "/workspace/linkedin/calendar", label: "Calendar" },
  { href: "/workspace/linkedin/brief", label: "Weekly brief" },
  { href: "/workspace/linkedin/profile", label: "Profile & pillars" },
  { href: "/workspace/linkedin/connect", label: "Connect" },
];

export default function LinkedInLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isSetup = pathname.startsWith("/workspace/linkedin/setup");

  return (
    <AppShell>
      <LinkedInProfileGate>
      <div className="flex min-h-0 flex-1 flex-col">
        {!isSetup && (
          <div className="border-b border-kova-border bg-white px-4 pt-2">
            <p className="text-xs font-medium text-kova-muted">
              LinkedIn
            </p>
            <nav className="-mb-px mt-2 flex gap-1 overflow-x-auto pb-0">
              {tabs.map((tab) => {
                const active =
                  tab.href === "/workspace/linkedin"
                    ? pathname === tab.href
                    : pathname.startsWith(tab.href);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition ${
                      active
                        ? "border-kova-green text-kova-green"
                        : "border-transparent text-kova-muted hover:text-kova-ink"
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
      </LinkedInProfileGate>
    </AppShell>
  );
}
