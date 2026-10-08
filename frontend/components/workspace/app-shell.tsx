"use client";

import type {
  ReactNode,
} from "react";

import {
  Sidebar,
} from "./sidebar";

import {
  Topbar,
} from "./topbar";


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
  return (
    <div className="min-h-screen bg-kova-background">

      <div className="flex min-h-screen">

        {/* Persistent desktop navigation */}
        <Sidebar />


        {/* Main application area */}
        <div className="flex min-w-0 flex-1 flex-col">

          <Topbar />


          <main className="flex-1">
            {children}
          </main>

        </div>

      </div>

    </div>
  );
}