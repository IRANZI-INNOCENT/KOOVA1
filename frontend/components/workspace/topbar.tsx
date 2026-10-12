"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

import { BusinessSwitcher } from "@/components/workspace/business-switcher";
import { MobileNavMenu } from "@/components/workspace/mobile-nav-menu";
import { useAuth } from "@/lib/auth-context";

const PAGE_TITLES: Record<string, { section: string; title: string }> = {
  "/workspace": { section: "Workspace", title: "Overview" },
  "/workspace/kova": { section: "AI Agent", title: "Kova" },
  "/workspace/brief": { section: "Daily", title: "Morning Brief" },
  "/workspace/social": { section: "Workspace", title: "Social" },
  "/workspace/linkedin": { section: "Workspace", title: "LinkedIn" },
  "/workspace/linkedin/setup": { section: "LinkedIn", title: "Set up profile" },
  "/workspace/onboarding": { section: "Account", title: "Get started" },
  "/workspace/social/channels": { section: "Social", title: "Channels" },
  "/workspace/social/studio": { section: "Social", title: "Content Studio" },
  "/workspace/social/calendar": { section: "Social", title: "Calendar" },
  "/workspace/social/engagement": { section: "Social", title: "Engagement" },
  "/workspace/social/leads": { section: "Social", title: "Social Leads" },
  "/workspace/social/performance": { section: "Social", title: "Performance" },
  "/workspace/commerce": { section: "Commerce", title: "Products" },
  "/workspace/inbox": { section: "Workspace", title: "Inbox" },
  "/workspace/leads": { section: "Workspace", title: "Leads" },
  "/workspace/analytics": { section: "Workspace", title: "Analytics" },
  "/workspace/settings": { section: "Account", title: "Settings" },
  "/workspace/setup": { section: "Account", title: "Business details" },
};

function getPageInfo(pathname: string) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  for (const [path, info] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(path) && path !== "/workspace") return info;
  }
  return { section: "Workspace", title: "Kova" };
}

export function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { section, title } = getPageInfo(pathname);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await signOut();
      router.push("/login");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <>
      <header className="flex shrink-0 items-center justify-between gap-2 bg-kova-green px-3 pt-[env(safe-area-inset-top)] text-white sm:px-6">
        <div className="flex h-16 min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-11 w-11 shrink-0 items-center justify-center text-white/80 hover:text-white lg:hidden"
            aria-label="Toggle navigation"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              {mobileMenuOpen ? (
                <>
                  <line x1="4" y1="4" x2="16" y2="16" />
                  <line x1="16" y1="4" x2="4" y2="16" />
                </>
              ) : (
                <>
                  <line x1="3" y1="5" x2="17" y2="5" />
                  <line x1="3" y1="10" x2="17" y2="10" />
                  <line x1="3" y1="15" x2="17" y2="15" />
                </>
              )}
            </svg>
          </button>

          <div className="min-w-0">
            <p className="truncate text-xs font-medium uppercase tracking-wider text-kova-orange">
              {section}
            </p>
            <h1 className="truncate text-base font-semibold leading-tight text-white">
              {title}
            </h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <BusinessSwitcher />
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-white">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-xs text-white/70">{user?.email}</p>
          </div>

          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-white">
            {user?.first_name?.charAt(0).toUpperCase()}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="rounded-md px-3 py-2 text-xs font-medium text-white/90 hover:text-kova-orange disabled:opacity-60"
          >
            {loggingOut ? "Signing out" : "Sign out"}
          </button>
        </div>
      </header>

      {/* Mobile navigation overlay */}
      {mobileMenuOpen && (
        <div className="max-h-[min(75dvh,32rem)] overflow-y-auto border-b border-kova-border bg-white px-4 py-4 lg:hidden">
          <p className="mb-2 px-3 text-xs font-bold uppercase tracking-wide text-gray-400">
            Workspace
          </p>
          <MobileNavMenu
            pathname={pathname}
            onNavigate={() => setMobileMenuOpen(false)}
          />
        </div>
      )}
    </>
  );
}

