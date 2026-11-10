"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/ui/logo";
import {
  isSidebarNavActive,
  SIDEBAR_NAV_GROUPS,
  type SidebarNavItem,
} from "@/components/workspace/sidebar-nav-config";

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={`hidden h-full shrink-0 flex-col overflow-hidden border-r border-white/10 bg-kova-green transition-[width] lg:flex ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      <div
        className={`flex h-16 shrink-0 items-center border-b border-white/15 ${
          collapsed ? "justify-center px-2" : "justify-between px-3"
        }`}
      >
        {collapsed ? (
          <button
            type="button"
            onClick={onToggle}
            aria-label="Expand sidebar"
            className="text-white/80 hover:text-white"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        ) : (
          <>
            <Logo href="/workspace" showTagline={false} tone="light" />
            <button
              type="button"
              onClick={onToggle}
              aria-label="Minimize sidebar"
              className="text-white/80 hover:text-white"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </button>
          </>
        )}
      </div>

      <nav
        aria-label="Workspace navigation"
        className="min-h-0 flex-1 overflow-y-auto px-2 py-4"
      >
        {SIDEBAR_NAV_GROUPS.map((group) => (
          <div key={group.title} className="mb-6 last:mb-2">
            {!collapsed ? (
              <p className="px-2.5 text-[10px] font-semibold uppercase tracking-wide text-white/45">
                {group.title}
              </p>
            ) : null}
            <div className={`space-y-0.5 ${collapsed ? "" : "mt-1.5"}`}>
              {group.items.map((item) => (
                <NavRow
                  key={item.href}
                  item={item}
                  active={isSidebarNavActive(pathname, item)}
                  collapsed={collapsed}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

function NavRow({
  item,
  active,
  collapsed,
}: {
  item: SidebarNavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const snap = item.href === "/workspace/commerce/snap-to-sell";
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      title={item.label}
      className={`flex items-center rounded-md py-2 pl-2.5 pr-2 text-[13px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80 ${
        collapsed ? "justify-center px-2" : "gap-2.5"
      } ${
        snap
          ? active
            ? "bg-kova-orange font-semibold text-kova-dark"
            : "text-kova-orange hover:bg-white/10"
          : active
            ? "bg-kova-orange font-semibold text-kova-dark"
            : "text-white/90 hover:bg-white/10 hover:text-white"
      }`}
    >
      <span className={active ? "text-kova-dark" : snap ? "text-kova-orange" : "text-white/90"}>
        {item.icon}
      </span>
      {!collapsed ? item.label : null}
    </Link>
  );
}
