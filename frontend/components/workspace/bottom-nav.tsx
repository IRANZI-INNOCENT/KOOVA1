"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  InboxNavIcon,
  SocialNavIcon,
} from "@/components/social/platform-brand";
import {
  NavIconSlot,
  OverviewNavIcon,
} from "@/components/workspace/nav-icon-slot";

type SideItem = {
  href: string;
  label: string;
  exact: boolean;
  brand?: "home" | "post" | "inbox" | "shop" | "settings";
};

const items: SideItem[] = [
  { href: "/workspace", label: "Home", exact: true, brand: "home" },
  { href: "/workspace/social", label: "Post", exact: false, brand: "post" },
  { href: "/workspace/inbox", label: "Inbox", exact: false, brand: "inbox" },
  { href: "/workspace/commerce", label: "Shop", exact: false, brand: "shop" },
  { href: "/workspace/settings", label: "Settings", exact: false, brand: "settings" },
];

function isCurrent(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname.startsWith(href);
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-kova-green pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="grid h-[4.25rem] grid-cols-5">
        {items.map((item) => {
          const active = isCurrent(pathname, item.href, item.exact);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                prefetch={true}
                aria-current={active ? "page" : undefined}
                className={`flex h-full flex-col items-center justify-center gap-0.5 px-0.5 text-[10px] font-semibold sm:text-xs ${
                  active ? "text-kova-orange" : "text-white"
                }`}
              >
                <NavMark brand={item.brand} active={active} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function NavMark({
  brand,
  active,
}: {
  brand?: SideItem["brand"];
  active: boolean;
}) {
  if (brand === "home") {
    return (
      <NavIconSlot>
        <OverviewNavIcon />
      </NavIconSlot>
    );
  }
  if (brand === "post") {
    return <SocialNavIcon size={14} />;
  }
  if (brand === "inbox") {
    return <InboxNavIcon size={10} />;
  }
  if (brand === "shop") {
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={active ? "text-kova-orange" : "text-white"}
      >
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>
    );
  }
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={active ? "text-kova-orange" : "text-white"}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001.08 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.6.84 1 1.51 1.08H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1.08z" />
    </svg>
  );
}
