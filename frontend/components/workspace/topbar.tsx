"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

import { BusinessSwitcher } from "@/components/workspace/business-switcher";
import { MobileNavMenu } from "@/components/workspace/mobile-nav-menu";
import { useAuth } from "@/lib/auth-context";

/** Single label in the topbar — avoid section + title double chrome. */
const PAGE_TITLES: Record<string, string> = {
  "/workspace": "Home",
  "/workspace/kova": "Talk to Kova",
  "/workspace/brief": "Reports",
  "/workspace/social": "Post",
  "/workspace/linkedin": "LinkedIn",
  "/workspace/linkedin/setup": "LinkedIn setup",
  "/workspace/onboarding": "Get started",
  "/workspace/social/channels": "Connect",
  "/workspace/social/studio": "Create",
  "/workspace/social/calendar": "Calendar",
  "/workspace/social/engagement": "Inbox",
  "/workspace/social/leads": "Leads",
  "/workspace/social/performance": "Reports",
  "/workspace/commerce": "Products",
  "/workspace/commerce/products": "Products",
  "/workspace/commerce/storefront": "Store",
  "/workspace/commerce/orders": "Orders",
  "/workspace/commerce/snap-to-sell": "Snap",
  "/workspace/inbox": "Inbox",
  "/workspace/leads": "Leads",
  "/workspace/analytics": "Reports",
  "/workspace/settings/email": "Email",
  "/workspace/settings/business": "Business",
  "/workspace/settings": "Settings",
  "/workspace/setup": "Basics",
};

function getPageTitle(pathname: string) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  for (const [path, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(path) && path !== "/workspace") return title;
  }
  return "KCOVA";
}

export function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const title = getPageTitle(pathname);

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

          <h1 className="min-w-0 truncate text-base font-semibold leading-tight text-white">
            {title}
          </h1>
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
            aria-label={loggingOut ? "Signing out" : "Sign out"}
            className="inline-flex h-11 items-center rounded-md px-2 text-xs font-medium text-white/90 hover:text-kova-orange disabled:opacity-60 sm:px-3"
          >
            <svg
              className="sm:hidden"
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
              <path d="M9 6H6a2 2 0 00-2 2v8a2 2 0 002 2h3" />
              <path d="M14 16l4-4-4-4" />
              <path d="M18 12H9" />
            </svg>
            <span className="hidden sm:inline">{loggingOut ? "Signing out" : "Sign out"}</span>
          </button>
        </div>
      </header>

      {/* Mobile navigation overlay */}
      {mobileMenuOpen && (
        <div className="max-h-[min(75dvh,32rem)] overflow-y-auto border-b border-kova-border bg-white px-4 py-4 lg:hidden">
          <p className="mb-2 px-3 text-xs font-medium text-gray-400">More</p>
          <BusinessSwitcher compact />
          <MobileNavMenu
            pathname={pathname}
            onNavigate={() => setMobileMenuOpen(false)}
          />
        </div>
      )}
    </>
  );
}

