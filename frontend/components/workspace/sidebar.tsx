"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

const navigationItems: NavigationItem[] = [
  {
    label: "Overview",
    href: "/workspace",
    icon: <Icon d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z M9 21V12h6v9" />,
  },
  {
    label: "Morning Brief",
    href: "/workspace/brief",
    icon: <Icon d="M12 2a10 10 0 100 20 10 10 0 000-20z M12 6v6l4 2" />,
  },
  {
    label: "Social",
    href: "/workspace/social",
    icon: <Icon d="M17 2H7a2 2 0 00-2 2v16l7-4 7 4V4a2 2 0 00-2-2z" />,
  },
  {
    label: "LinkedIn",
    href: "/workspace/linkedin",
    icon: <Icon d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6z M2 9h4v12H2z M4 6a2 2 0 100-4 2 2 0 000 4z" />,
  },
  {
    label: "Commerce",
    href: "/workspace/commerce",
    icon: <Icon d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z M3 6h18 M16 10a4 4 0 01-8 0" />,
  },
  {
    label: "Inbox",
    href: "/workspace/inbox",
    icon: <Icon d="M4 4h16v12H5.17L4 17.17V4z M8 9h8 M8 12h4" />,
  },
  {
    label: "Leads",
    href: "/workspace/leads",
    icon: <Icon d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2 M9 11a4 4 0 100-8 4 4 0 000 8z M22 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75" />,
  },
  {
    label: "Analytics",
    href: "/workspace/analytics",
    icon: <Icon d="M18 20V10 M12 20V4 M6 20v-6" />,
  },
];

const secondaryNavigationItems: NavigationItem[] = [
  {
    label: "Settings",
    href: "/workspace/settings",
    icon: <Icon d="M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001.08 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.6.84 1 1.51 1.08H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1.08z" />,
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
                className={`flex items-center gap-3 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors ${
                  collapsed ? "justify-center" : ""
                } ${
                  active
                    ? "bg-white text-kova-green"
                    : "text-white/85 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className={`shrink-0 ${active ? "text-kova-green" : "text-white/70"}`}>
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
                  className={`flex items-center gap-3 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors ${
                    collapsed ? "justify-center" : ""
                  } ${
                    active
                      ? "bg-white text-kova-green"
                      : "text-white/85 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className={`shrink-0 ${active ? "text-kova-green" : "text-white/70"}`}>
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
