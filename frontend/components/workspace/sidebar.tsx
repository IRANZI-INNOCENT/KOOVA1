"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Logo } from "@/components/ui/logo";
import {
  isSidebarNavActive,
  SIDEBAR_NAV_GROUPS,
  type SidebarNavGroup,
  type SidebarNavItem,
} from "@/components/workspace/sidebar-nav-config";

const GROUPS_STORAGE_KEY = "kova-sidebar-groups-open";

function readGroupsOpen(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(GROUPS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {};
  }
}

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const [groupsOpen, setGroupsOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setGroupsOpen(readGroupsOpen());
  }, []);

  const activeByGroup = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const group of SIDEBAR_NAV_GROUPS) {
      map[group.title] = group.items.some((item) =>
        isSidebarNavActive(pathname, item),
      );
    }
    return map;
  }, [pathname]);

  const setGroupOpen = useCallback((title: string, open: boolean) => {
    setGroupsOpen((prev) => {
      const next = { ...prev, [title]: open };
      window.localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

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
        className="sidebar-nav-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 py-3"
      >
        {SIDEBAR_NAV_GROUPS.map((group) => (
          <NavGroup
            key={group.title}
            group={group}
            pathname={pathname}
            collapsed={collapsed}
            open={
              collapsed
                ? true
                : groupsOpen[group.title] ?? activeByGroup[group.title] ?? true
            }
            onOpenChange={(open) => setGroupOpen(group.title, open)}
          />
        ))}
      </nav>
    </aside>
  );
}

function NavGroup({
  group,
  pathname,
  collapsed,
  open,
  onOpenChange,
}: {
  group: SidebarNavGroup;
  pathname: string;
  collapsed: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <div className="mb-2.5 last:mb-1">
      {collapsed ? null : (
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          aria-expanded={open}
          className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-white/45 hover:bg-white/5 hover:text-white/70"
        >
          <span>{group.title}</span>
          <Chevron open={open} />
        </button>
      )}
      {open || collapsed ? (
        <div className={`space-y-0.5 ${collapsed ? "" : "mt-1"}`}>
          {group.items.map((item) => (
            <NavRow
              key={item.href}
              item={item}
              active={isSidebarNavActive(pathname, item)}
              collapsed={collapsed}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={`shrink-0 text-white/50 transition-transform ${open ? "rotate-180" : ""}`}
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
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
