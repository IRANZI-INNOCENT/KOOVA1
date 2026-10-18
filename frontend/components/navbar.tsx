"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/ui/logo";

const links = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Social", href: "/#social" },
  { label: "Commerce", href: "/#commerce" },
  { label: "Guides", href: "/guides" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-kova-green/95 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center justify-between gap-3 px-4 lg:px-8">
        <Logo href="/" tone="light" />

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {links.map((link) => {
            const active =
              link.href === "/guides" &&
              (pathname === "/guides" || pathname?.startsWith("/guides/"));
            return (
              <a
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "text-[13px] font-semibold text-kova-orange transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-kova-green"
                    : "text-[13px] font-medium text-white/88 transition-colors hover:text-kova-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-kova-green"
                }
              >
                {link.label}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="/login"
            className="hidden text-[13px] font-medium text-white/88 transition-colors hover:text-kova-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-kova-green sm:block"
          >
            Log in
          </a>
          <a
            href="/signup"
            className="inline-flex h-9 shrink-0 items-center rounded-md bg-kova-orange px-3.5 text-[13px] font-semibold text-kova-dark transition-colors hover:bg-[#f0a46e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-kova-green sm:px-4"
          >
            Start free trial
          </a>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-kova-green md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              {open ? (
                <>
                  <path d="M4 4l12 12" />
                  <path d="M16 4L4 16" />
                </>
              ) : (
                <>
                  <path d="M3 5h14" />
                  <path d="M3 10h14" />
                  <path d="M3 15h14" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav
          className="border-t border-white/10 bg-kova-green px-5 py-3 md:hidden"
          aria-label="Mobile"
        >
          {links.map((link) => {
            const active =
              link.href === "/guides" &&
              (pathname === "/guides" || pathname?.startsWith("/guides/"));
            return (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "block py-2.5 text-sm font-semibold text-kova-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    : "block py-2.5 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                }
              >
                {link.label}
              </a>
            );
          })}
          <a
            href="/login"
            className="block py-2.5 text-sm font-medium text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Log in
          </a>
        </nav>
      )}
    </header>
  );
}
