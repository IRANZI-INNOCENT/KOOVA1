"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  PlatformBrandIcon,
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
  icon?: string;
  brand?: "social" | "linkedin" | "overview";
  emoji?: string;
};

const sideItems: SideItem[] = [
  {
    href: "/workspace",
    label: "Overview",
    exact: true,
    brand: "overview",
  },
  {
    href: "/workspace/social",
    label: "Social",
    exact: false,
    brand: "social",
  },
  {
    href: "/workspace/commerce",
    label: "Shop",
    exact: false,
    emoji: "🛍️",
  },
  {
    href: "/workspace/linkedin",
    label: "LinkedIn",
    exact: false,
    brand: "linkedin",
  },
];

function isCurrent(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname.startsWith(href);
}

export function BottomNav() {
  const pathname = usePathname();
  const left = sideItems.slice(0, 2);
  const right = sideItems.slice(2);
  const snapActive = pathname.startsWith("/workspace/commerce/snap-to-sell");

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-kova-green pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="grid h-[4.25rem] grid-cols-5">
        {left.map((item) => (
          <SideLink key={item.href} item={item} pathname={pathname} />
        ))}
        <li>
          <Link
            href="/workspace/commerce/snap-to-sell"
            prefetch={true}
            aria-current={snapActive ? "page" : undefined}
            className="flex h-full flex-col items-center justify-center gap-0.5"
          >
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-full bg-kova-orange text-kova-dark ${
                snapActive
                  ? "ring-2 ring-white ring-offset-2 ring-offset-kova-green"
                  : ""
              }`}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M12 5v14 M5 12h14" />
              </svg>
            </span>
            <span
              className={`text-[10px] font-semibold sm:text-xs ${
                snapActive ? "text-kova-orange" : "text-white"
              }`}
            >
              Snap
            </span>
          </Link>
        </li>
        {right.map((item) => (
          <SideLink key={item.href} item={item} pathname={pathname} />
        ))}
      </ul>
    </nav>
  );
}

function SideLink({
  item,
  pathname,
}: {
  item: SideItem;
  pathname: string;
}) {
  const active = isCurrent(pathname, item.href, item.exact);
  return (
    <li>
      <Link
        href={item.href}
        prefetch={true}
        aria-current={active ? "page" : undefined}
        className={`flex h-full flex-col items-center justify-center gap-0.5 px-0.5 text-[10px] font-semibold sm:text-xs ${
          active ? "text-kova-orange" : "text-white"
        }`}
      >
        {item.brand === "overview" ? (
          <NavIconSlot>
            <OverviewNavIcon />
          </NavIconSlot>
        ) : item.brand === "social" ? (
          <SocialNavIcon size={14} />
        ) : item.brand === "linkedin" ? (
          <PlatformBrandIcon platform="linkedin" size={22} />
        ) : item.emoji ? (
          <span className="text-lg leading-none" aria-hidden>
            {item.emoji}
          </span>
        ) : (
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
          >
            <path d={item.icon!} />
          </svg>
        )}
        {item.label}
      </Link>
    </li>
  );
}
