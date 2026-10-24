"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface SectionTab {
  href: string;
  label: string;
  exact?: boolean;
}

interface WorkspaceSectionNavProps {
  tabs: readonly SectionTab[];
  /** Shown on small screens inside the “More” menu */
  moreTabs?: readonly SectionTab[];
  ariaLabel: string;
  maxWidthClass?: string;
}

function tabActive(pathname: string, tab: SectionTab) {
  return tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
}

/**
 * Horizontal section tabs (Social, Commerce, etc.) with optional mobile “More”.
 */
export function WorkspaceSectionNav({
  tabs,
  moreTabs = [],
  ariaLabel,
  maxWidthClass = "max-w-6xl",
}: WorkspaceSectionNavProps) {
  const pathname = usePathname();
  const moreActive = moreTabs.some((t) => tabActive(pathname, t));

  return (
    <nav
      aria-label={ariaLabel}
      className="shrink-0 border-b border-kova-border bg-white px-4 sm:px-8"
    >
      <div className={`mx-auto ${maxWidthClass}`}>
        <ul className="-mb-px flex touch-pan-x gap-0.5 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((tab) => {
            const active = tabActive(pathname, tab);
            return (
              <li key={tab.href} className="shrink-0">
                <Link
                  href={tab.href}
                  prefetch
                  className={navLinkClass(active)}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
          {moreTabs.length > 0 && (
            <li className="relative shrink-0 md:hidden">
              <details className="group">
                <summary
                  className={`${navLinkClass(moreActive)} list-none cursor-pointer [&::-webkit-details-marker]:hidden`}
                >
                  More
                </summary>
                <ul className="absolute right-0 z-20 mt-0 min-w-[10rem] rounded-md border border-kova-border bg-white py-1 shadow-md">
                  {moreTabs.map((tab) => (
                    <li key={tab.href}>
                      <Link
                        href={tab.href}
                        className={`block px-3 py-2 text-sm ${
                          tabActive(pathname, tab)
                            ? "font-semibold text-kova-dark"
                            : "text-gray-600 hover:bg-kova-background"
                        }`}
                      >
                        {tab.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          )}
          {moreTabs.map((tab) => {
            const active = tabActive(pathname, tab);
            return (
              <li key={`md-${tab.href}`} className="hidden shrink-0 md:list-item">
                <Link href={tab.href} prefetch className={navLinkClass(active)}>
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

function navLinkClass(active: boolean) {
  return `inline-flex items-center whitespace-nowrap border-b-2 px-3.5 py-3 text-sm font-medium transition-colors ${
    active
      ? "border-kova-orange text-kova-dark"
      : "border-transparent text-gray-400 hover:border-kova-border hover:text-kova-dark"
  }`;
}
