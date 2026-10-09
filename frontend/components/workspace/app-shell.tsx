"use client";

import { useEffect, useState, type ReactNode } from "react";

import { BottomNav } from "./bottom-nav";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";


/**
 * Props accepted by the Kova application shell.
 */
interface AppShellProps {
  children: ReactNode;
}


/**
 * Main authenticated application shell.
 *
 * The shell provides the persistent navigation and account
 * interface around every authenticated Kova workspace page.
 *
 * Page-specific functionality remains inside the children so
 * the shell does not become coupled to individual product areas.
 */
export function AppShell({
  children,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem("kova-sidebar-collapsed") === "1");
  }, []);

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("kova-sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  }

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-kova-background">

      <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-[calc(4.25rem+env(safe-area-inset-bottom))] lg:pb-0">
          {children}
        </main>
        <BottomNav />
      </div>

    </div>
  );
}