"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/workspace/app-shell";

const TABS: readonly { href: string; label: string; exact?: boolean }[] = [
  { href: "/workspace/social", label: "Overview", exact: true },
  { href: "/workspace/social/channels", label: "Channels" },
  { href: "/workspace/social/studio", label: "Content Studio" },
  { href: "/workspace/social/calendar", label: "Calendar" },
  { href: "/workspace/social/engagement", label: "Engagement" },
  { href: "/workspace/social/leads", label: "Social Leads" },
  { href: "/workspace/social/performance", label: "Performance" },
  { href: "/workspace/social/autopilot", label: "Autopilot" },
];

export default function SocialLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AppShell>
      <div className="flex min-h-0 flex-1 flex-col">
        <nav
          aria-label="Social sections"
          className="shrink-0 border-b border-kova-border bg-white px-4 sm:px-8"
        >
          <div className="mx-auto max-w-6xl">
            <ul className="-mb-px flex gap-0.5 overflow-x-auto">
              {TABS.map((tab) => {
                const active = tab.exact
                  ? pathname === tab.href
                  : pathname.startsWith(tab.href);
                return (
                  <li key={tab.href}>
                    <Link
                      href={tab.href}
                      prefetch={true}
                      className={`inline-flex items-center whitespace-nowrap border-b-2 px-3.5 py-3 text-sm font-medium transition-colors ${
                        active
                          ? "border-kova-orange text-kova-dark"
                          : "border-transparent text-gray-400 hover:border-kova-border hover:text-kova-dark"
                      }`}
                    >
                      {tab.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
        <div className="flex-1 overflow-y-auto bg-kova-background">
          {children}
        </div>
      </div>
    </AppShell>
  );
}
