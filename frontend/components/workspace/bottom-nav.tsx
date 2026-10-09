"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sideItems = [
  {
    href: "/workspace",
    label: "Today",
    exact: true,
    icon: "M12 4a5 5 0 1 0 0 10 5 5 0 0 0 0-10z M12 1.5v2 M12 16.5v2 M4.2 4.2l1.4 1.4 M14.4 14.4l1.4 1.4 M1.5 9h2 M16.5 9h2 M4.2 13.8l1.4-1.4 M14.4 3.6l1.4-1.4",
  },
  {
    href: "/workspace/kova",
    label: "Ask",
    exact: false,
    icon: "M5 5h14v9H8l-3 3z",
  },
  {
    href: "/workspace/inbox",
    label: "Inbox",
    exact: false,
    icon: "M4 5h16v11H6.5L4 18.5z M8 9h8 M8 12h5",
  },
  {
    href: "/workspace/social",
    label: "Social",
    exact: false,
    icon: "M7 4h10a1 1 0 0 1 1 1v15l-6-3.5L6 20V5a1 1 0 0 1 1-1z",
  },
] as const;

function isCurrent(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname.startsWith(href);
}

export function BottomNav() {
  const pathname = usePathname();
  const left = sideItems.slice(0, 2);
  const right = sideItems.slice(2);
  const snapActive = pathname.startsWith("/workspace/commerce");

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 bg-kova-green pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="grid h-[4.25rem] grid-cols-5">
        {left.map((item) => (
          <SideLink key={item.href} item={item} pathname={pathname} />
        ))}
        <li>
          <Link
            href="/workspace/commerce"
            aria-current={snapActive ? "page" : undefined}
            className="flex h-full flex-col items-center justify-center gap-1"
          >
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-full bg-kova-orange text-kova-dark ${
                snapActive ? "ring-2 ring-white ring-offset-2 ring-offset-kova-green" : ""
              }`}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M12 5v14 M5 12h14" />
              </svg>
            </span>
            <span
              className={`text-xs font-semibold ${
                snapActive ? "text-kova-orange" : "text-white"
              }`}
            >
              Snap
            </span>
          </Link>
        </li>
        {right.map((item) => (
          <SideLink key={item.href} item={item} pathname={pathname} />
        ))}
      </ul>
    </nav>
  );
}

function SideLink({
  item,
  pathname,
}: {
  item: (typeof sideItems)[number];
  pathname: string;
}) {
  const active = isCurrent(pathname, item.href, item.exact);
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`flex h-full flex-col items-center justify-center gap-1 text-xs font-semibold ${
          active ? "text-kova-orange" : "text-white"
        }`}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d={item.icon} />
        </svg>
        {item.label}
      </Link>
    </li>
  );
}
