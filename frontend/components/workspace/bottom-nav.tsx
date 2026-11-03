"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { InboxNavIcon } from "@/components/social/platform-brand";
import {
  CameraNavIcon,
  NavIconSlot,
  OverviewNavIcon,
  PlusNavIcon,
} from "@/components/workspace/nav-icon-slot";

type SideItem = {
  href: string;
  label: string;
  exact: boolean;
  brand: "home" | "post" | "snap" | "inbox" | "shop";
};

const items: SideItem[] = [
  { href: "/workspace", label: "Home", exact: true, brand: "home" },
  { href: "/workspace/social", label: "Post", exact: false, brand: "post" },
  {
    href: "/workspace/commerce/snap-to-sell",
    label: "Snap",
    exact: false,
    brand: "snap",
  },
  { href: "/workspace/inbox", label: "Inbox", exact: false, brand: "inbox" },
  { href: "/workspace/commerce", label: "Shop", exact: false, brand: "shop" },
];

function isCurrent(pathname: string, item: SideItem) {
  if (item.brand === "shop") {
    return (
      pathname.startsWith("/workspace/commerce") &&
      !pathname.startsWith("/workspace/commerce/snap-to-sell")
    );
  }
  if (item.brand === "snap") {
    return pathname.startsWith("/workspace/commerce/snap-to-sell");
  }
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
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
          const active = isCurrent(pathname, item);
          if (item.brand === "snap") {
            return (
              <li key={item.href} className="relative">
                <Link
                  href={item.href}
                  prefetch={true}
                  aria-current={active ? "page" : undefined}
                  data-coach="nav-snap"
                  className="flex h-full flex-col items-center justify-end gap-0.5 pb-1.5"
                >
                  <span
                    className={`-mt-2 flex h-10 w-10 items-center justify-center rounded-full bg-kova-orange text-kova-dark shadow-[0_3px_8px_rgba(23,33,29,0.22)] ring-2 ring-kova-green ${
                      active ? "ring-white/70" : ""
                    }`}
                  >
                    <CameraNavIcon size={20} />
                  </span>
                  <span className="text-[11px] font-semibold text-kova-orange sm:text-xs">
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          }
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                prefetch={true}
                aria-current={active ? "page" : undefined}
                data-coach={
                  item.href === "/workspace/social"
                    ? "nav-post"
                    : item.href === "/workspace/commerce"
                      ? "nav-shop"
                      : undefined
                }
                className={`flex h-full flex-col items-center justify-end gap-0.5 px-0.5 pb-1.5 text-[11px] font-semibold sm:text-xs ${
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
  brand: SideItem["brand"];
  active: boolean;
}) {
  if (brand === "home") {
    return (
      <NavIconSlot>
        <OverviewNavIcon size={22} />
      </NavIconSlot>
    );
  }
  if (brand === "post") {
    return <PlusNavIcon size={22} />;
  }
  if (brand === "inbox") {
    return <InboxNavIcon size={14} />;
  }
  if (brand === "shop") {
    return (
      <svg
        width="22"
        height="22"
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
  return null;
}
