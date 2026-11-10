import type { ReactNode } from "react";

import { InboxNavIcon } from "@/components/social/platform-brand";
import {
  CameraNavIcon,
  NavIconSlot,
  OverviewNavIcon,
  PlusNavIcon,
} from "@/components/workspace/nav-icon-slot";

export interface SidebarNavItem {
  label: string;
  href: string;
  icon: ReactNode;
  exact?: boolean;
}

export interface SidebarNavGroup {
  title: string;
  items: SidebarNavItem[];
}

function ShopIcon() {
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
      <path d="M6 2 3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  );
}

function SettingsIcon() {
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
      <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001.08 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.6.84 1 1.51 1.08H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1.08z" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" />
    </svg>
  );
}

/** Desktop sidebar groups — only routes that exist today. */
export const SIDEBAR_NAV_GROUPS: SidebarNavGroup[] = [
  {
    title: "Business",
    items: [
      {
        label: "Overview",
        href: "/workspace",
        exact: true,
        icon: (
          <NavIconSlot>
            <OverviewNavIcon />
          </NavIconSlot>
        ),
      },
      {
        label: "Shop",
        href: "/workspace/commerce",
        icon: (
          <NavIconSlot>
            <ShopIcon />
          </NavIconSlot>
        ),
      },
      {
        label: "Snap to Sell",
        href: "/workspace/commerce/snap-to-sell",
        icon: (
          <NavIconSlot>
            <CameraNavIcon size={18} />
          </NavIconSlot>
        ),
      },
      {
        label: "Orders",
        href: "/workspace/commerce/orders",
        icon: (
          <NavIconSlot>
            <ShopIcon />
          </NavIconSlot>
        ),
      },
      {
        label: "Expenses",
        href: "/workspace/commerce/expenses",
        icon: (
          <NavIconSlot>
            <ShopIcon />
          </NavIconSlot>
        ),
      },
    ],
  },
  {
    title: "Marketing",
    items: [
      {
        label: "Post",
        href: "/workspace/social",
        icon: (
          <NavIconSlot>
            <PlusNavIcon size={18} />
          </NavIconSlot>
        ),
      },
      {
        label: "Calendar",
        href: "/workspace/social/calendar",
        icon: (
          <NavIconSlot>
            <PlusNavIcon size={18} />
          </NavIconSlot>
        ),
      },
      {
        label: "Channels",
        href: "/workspace/social/channels",
        icon: (
          <NavIconSlot>
            <PlusNavIcon size={18} />
          </NavIconSlot>
        ),
      },
      {
        label: "Inbox",
        href: "/workspace/inbox",
        icon: (
          <NavIconSlot>
            <InboxNavIcon size={10} />
          </NavIconSlot>
        ),
      },
      {
        label: "Leads",
        href: "/workspace/leads",
        icon: (
          <NavIconSlot>
            <InboxNavIcon size={10} />
          </NavIconSlot>
        ),
      },
    ],
  },
  {
    title: "Intelligence",
    items: [
      {
        label: "Ask KCOVA",
        href: "/workspace/kova",
        icon: (
          <NavIconSlot>
            <SparkIcon />
          </NavIconSlot>
        ),
      },
      {
        label: "Analytics",
        href: "/workspace/analytics",
        icon: (
          <NavIconSlot>
            <OverviewNavIcon />
          </NavIconSlot>
        ),
      },
      {
        label: "For you",
        href: "/workspace/approvals",
        icon: (
          <NavIconSlot>
            <SparkIcon />
          </NavIconSlot>
        ),
      },
      {
        label: "Brief",
        href: "/workspace/brief",
        icon: (
          <NavIconSlot>
            <SparkIcon />
          </NavIconSlot>
        ),
      },
    ],
  },
  {
    title: "Settings",
    items: [
      {
        label: "Settings",
        href: "/workspace/settings",
        icon: (
          <NavIconSlot>
            <SettingsIcon />
          </NavIconSlot>
        ),
      },
    ],
  },
];

export function isSidebarNavActive(
  pathname: string,
  item: SidebarNavItem,
): boolean {
  if (item.href === "/workspace/commerce") {
    return (
      pathname.startsWith("/workspace/commerce") &&
      !pathname.startsWith("/workspace/commerce/snap-to-sell") &&
      !pathname.startsWith("/workspace/commerce/orders") &&
      !pathname.startsWith("/workspace/commerce/expenses")
    );
  }
  if (item.exact || item.href === "/workspace") {
    return pathname === item.href;
  }
  return pathname.startsWith(item.href);
}
