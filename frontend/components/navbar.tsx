"use client";

import { useState } from "react";

import { Logo } from "@/components/ui/logo";

const links = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Snap to Sell", href: "/#commerce" },
  { label: "Kova", href: "/#social" },
  { label: "Pricing", href: "/#pricing" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-kova-green pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 lg:px-8">
        <Logo href="/" tone="light" />

        <nav className="hidden items-center gap-7 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-white/90 transition-colors hover:text-kova-orange"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="/login"
            className="hidden text-sm font-medium text-white/90 transition-colors hover:text-kova-orange sm:block"
          >
            Log in
          </a>
          <a
            href="/signup"
            className="inline-flex h-9 shrink-0 items-center rounded-md bg-kova-orange px-3 text-sm font-semibold text-kova-dark transition-colors hover:bg-[#f0a46e] sm:px-4"
          >
            Start free
          </a>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center text-white md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((current) => !current)}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
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
        <nav className="border-t border-white/10 bg-kova-green px-5 py-3 md:hidden">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block py-2.5 text-sm font-medium text-white"
            >
              {link.label}
            </a>
          ))}
          <a href="/login" className="block py-2.5 text-sm font-medium text-white/80">
            Log in
          </a>
        </nav>
      )}
    </header>
  );
}
