"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  InboxNavIcon,
  PlatformBrandIcon,
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
}

function Icon({ d, ...props }: { d: string } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d={d} />
    </svg>
  );
}

/** Colorful nav marks (same visual weight as platform logos). */
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

const navigationItems: NavigationItem[] = [
  {
    label: "Overview",
    href: "/workspace",
    icon: (
      <NavIconSlot>
        <OverviewNavIcon />
      </NavIconSlot>
    ),
  },
  {
    label: "Social",
    href: "/workspace/social",
    icon: (
      <NavIconSlot>
        <SocialNavIcon size={15} />
      </NavIconSlot>
    ),
  },
  {
    label: "LinkedIn",
    href: "/workspace/linkedin",
    icon: (
      <NavIconSlot>
        <PlatformBrandIcon platform="linkedin" size={18} />
      </NavIconSlot>
    ),
  },
  {
    label: "Commerce",
    href: "/workspace/commerce",
    icon: (
      <NavIconSlot>
        <NavEmoji symbol="🛍️" label="Commerce" />
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
        <NavEmoji symbol="🎯" label="Leads" />
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
    if (item.href === "/workspace") return pathname === "/workspace";
    return pathname.startsWith(item.href);
  }

  const isKovaActive = pathname.startsWith("/workspace/kova");

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

      <div className="px-2 pt-4">
        <Link
          href="/workspace/kova"
          title="Talk to Kova"
          className={`flex items-center gap-3 rounded-md px-2.5 py-2.5 text-sm font-semibold transition-colors ${
            collapsed ? "justify-center" : ""
          } ${
            isKovaActive
              ? "bg-white text-kova-green"
              : "bg-white/10 text-white hover:bg-white/15"
          }`}
        >
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
            isKovaActive ? "bg-kova-green text-white" : "bg-kova-orange text-kova-dark"
          }`}>
            K
          </span>
          {!collapsed && "Talk to Kova"}
        </Link>
      </div>

      {/* Primary navigation */}
      <nav aria-label="Workspace navigation" className="min-h-0 flex-1 overflow-y-auto px-2 pt-6">
        {!collapsed && (
          <p className="px-3 text-xs font-semibold uppercase tracking-[0.16em] text-kova-orange">
            Workspace
          </p>
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
                <span
                  className={
                    active ? "text-kova-dark" : "text-white/90"
                  }
                >
                  {item.icon}
                </span>
                {!collapsed && item.label}
              </Link>
            );
          })}
        </div>

        {/* Secondary navigation */}
        <div className="mt-8">
          {!collapsed && (
            <p className="px-3 text-xs font-semibold uppercase tracking-[0.16em] text-kova-orange">
              Account
            </p>
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
                  <span
                    className={
                      active ? "text-kova-dark" : "text-white/90"
                    }
                  >
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
