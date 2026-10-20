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
import { Logo } from "@/components/ui/logo";

interface NavigationItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  exact?: boolean;
}

function Icon({ d, ...props }: { d: string } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d={d} />
    </svg>
  );
}

function NavEmoji({
  symbol,
  label,
}: {
  symbol: string;
  label: string;
}) {
  return (
    <span
      className="flex h-[18px] w-[18px] items-center justify-center text-[15px] leading-none"
      role="img"
      aria-label={label}
    >
      {symbol}
    </span>
  );
}

/** Primary IA: Home · Post · Inbox · Shop · Settings */
const navigationItems: NavigationItem[] = [
  {
    label: "Home",
    href: "/workspace",
    exact: true,
    icon: (
      <NavIconSlot>
        <OverviewNavIcon />
      </NavIconSlot>
    ),
  },
  {
    label: "Post",
    href: "/workspace/social",
    icon: (
      <NavIconSlot>
        <SocialNavIcon size={15} />
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
    label: "Shop",
    href: "/workspace/commerce",
    icon: (
      <NavIconSlot>
        <NavEmoji symbol="🛍️" label="Shop" />
      </NavIconSlot>
    ),
  },
];

const secondaryNavigationItems: NavigationItem[] = [
  {
    label: "Settings",
    href: "/workspace/settings",
    icon: (
      <NavIconSlot>
        <Icon d="M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001.08 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.6.84 1 1.51 1.08H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1.08z" />
      </NavIconSlot>
    ),
  },
];

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();

  function isActive(item: NavigationItem): boolean {
    if (item.exact || item.href === "/workspace") {
      return pathname === "/workspace";
    }
    return pathname.startsWith(item.href);
  }

  return (
    <aside className={`hidden h-full shrink-0 flex-col overflow-hidden bg-kova-green transition-[width] lg:flex ${collapsed ? "w-16" : "w-48"}`}>
      <div className={`flex h-16 shrink-0 items-center border-r border-white/25 ${collapsed ? "justify-center px-2" : "justify-between px-3"}`}>
        {collapsed ? (
          <button type="button" onClick={onToggle} aria-label="Expand sidebar" className="text-white/80 hover:text-white">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        ) : (
          <>
            <Logo href="/workspace" showTagline={false} tone="light" />
            <button type="button" onClick={onToggle} aria-label="Minimize sidebar" className="text-white/80 hover:text-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </button>
          </>
        )}
      </div>

      <nav aria-label="Workspace navigation" className="min-h-0 flex-1 overflow-y-auto px-2 pt-6">
        {!collapsed && (
          <p className="px-3 text-xs font-medium text-white/50">Workspace</p>
        )}
        <div className="mt-2 space-y-0.5">
          {navigationItems.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                title={item.label}
                className={`flex items-center rounded-md py-2 pl-2.5 pr-2.5 text-[13px] font-medium transition-colors ${
                  collapsed ? "justify-center px-2.5" : "gap-2.5"
                } ${
                  active
                    ? "bg-kova-orange font-semibold text-kova-dark"
                    : "text-white/85 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className={active ? "text-kova-dark" : "text-white/90"}>
                  {item.icon}
                </span>
                {!collapsed && item.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-8">
          {!collapsed && (
            <p className="px-3 text-xs font-medium text-white/50">Account</p>
          )}
          <div className="mt-2 space-y-0.5">
            {secondaryNavigationItems.map((item) => {
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  title={item.label}
                  className={`flex items-center rounded-md py-2 pl-2.5 pr-2.5 text-[13px] font-medium transition-colors ${
                    collapsed ? "justify-center px-2.5" : "gap-2.5"
                  } ${
                    active
                      ? "bg-kova-orange font-semibold text-kova-dark"
                      : "text-white/85 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className={active ? "text-kova-dark" : "text-white/90"}>
                    {item.icon}
                  </span>
                  {!collapsed && item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </aside>
  );
}
