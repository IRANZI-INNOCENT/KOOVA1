"use client";

import Link from "next/link";

import { PlatformBrandIcon } from "@/components/social/platform-brand";

type MobileNavItem = {
  href: string;
  label: string;
  exact?: boolean;
  brand?: "linkedin" | "settings";
};

/** Secondary destinations. Home, Post, Snap, Inbox, and Shop stay in the bottom nav. */
export const MOBILE_MORE_LINKS: MobileNavItem[] = [
  { href: "/workspace/settings", label: "Settings", brand: "settings" },
  { href: "/workspace/analytics", label: "Reports" },
  { href: "/workspace/kova", label: "Talk to KCOVA" },
  { href: "/workspace/linkedin", label: "LinkedIn", brand: "linkedin" },
];

function SettingsMark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001.08 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.6.84 1 1.51 1.08H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1.08z" />
    </svg>
  );
}

export function MobileNavMenu({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <nav className="space-y-1" aria-label="Workspace menu">
      {MOBILE_MORE_LINKS.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium ${
              active
                ? "bg-kova-background text-kova-green"
                : "text-gray-700 hover:bg-kova-background"
            }`}
          >
            {item.brand === "linkedin" ? (
              <PlatformBrandIcon platform="linkedin" size={18} />
            ) : item.brand === "settings" ? (
              <SettingsMark />
            ) : (
              <span className="h-[18px] w-[18px]" aria-hidden />
            )}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
