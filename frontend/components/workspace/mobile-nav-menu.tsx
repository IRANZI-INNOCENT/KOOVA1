"use client";

import Link from "next/link";

import { PlatformBrandIcon } from "@/components/social/platform-brand";

type MobileNavItem = {
  href: string;
  label: string;
  exact?: boolean;
  brand?: "linkedin";
};

/** Secondary destinations — primary five live in the bottom nav. */
export const MOBILE_MORE_LINKS: MobileNavItem[] = [
  { href: "/workspace/analytics", label: "Reports" },
  { href: "/workspace/kova", label: "Talk to Kova" },
  { href: "/workspace/linkedin", label: "LinkedIn", brand: "linkedin" },
];

export function MobileNavMenu({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <nav className="space-y-1" aria-label="Workspace menu">
      {MOBILE_MORE_LINKS.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium ${
              active
                ? "bg-kova-background text-kova-green"
                : "text-gray-700 hover:bg-kova-background"
            }`}
          >
            {item.brand === "linkedin" ? (
              <PlatformBrandIcon platform="linkedin" size={18} />
            ) : (
              <span className="h-[18px] w-[18px]" aria-hidden />
            )}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
