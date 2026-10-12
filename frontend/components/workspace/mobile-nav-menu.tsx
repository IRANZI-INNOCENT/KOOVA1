"use client";

import Link from "next/link";

import {
  InboxNavIcon,
  PlatformBrandIcon,
  SocialNavIcon,
} from "@/components/social/platform-brand";
import {
  NavIconSlot,
  OverviewNavIcon,
} from "@/components/workspace/nav-icon-slot";

type MobileNavItem = {
  href: string;
  label: string;
  exact?: boolean;
  emoji?: string;
  brand?: "social" | "linkedin" | "inbox" | "overview";
};

export const MOBILE_MORE_LINKS: MobileNavItem[] = [
  { href: "/workspace", label: "Overview", brand: "overview", exact: true },
  { href: "/workspace/social", label: "Social", brand: "social" },
  { href: "/workspace/linkedin", label: "LinkedIn", brand: "linkedin" },
  { href: "/workspace/commerce", label: "Commerce", emoji: "🛍️" },
  { href: "/workspace/inbox", label: "Inbox", brand: "inbox" },
  { href: "/workspace/leads", label: "Leads", emoji: "🎯" },
  { href: "/workspace/kova", label: "Talk to Kova", emoji: "💬" },
  { href: "/workspace/settings", label: "Settings", emoji: "⚙️" },
];

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
            <NavMark item={item} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function NavMark({ item }: { item: MobileNavItem }) {
  if (item.brand === "overview") {
    return (
      <NavIconSlot>
        <OverviewNavIcon className="text-kova-green" />
      </NavIconSlot>
    );
  }
  if (item.brand === "social") {
    return <SocialNavIcon size={14} />;
  }
  if (item.brand === "linkedin") {
    return <PlatformBrandIcon platform="linkedin" size={18} />;
  }
  if (item.brand === "inbox") {
    return <InboxNavIcon size={10} />;
  }
  if (item.emoji) {
    return (
      <span className="flex h-[18px] w-[18px] items-center justify-center text-base leading-none">
        {item.emoji}
      </span>
    );
  }
  return null;
}
