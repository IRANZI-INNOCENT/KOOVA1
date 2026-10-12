import type { ReactNode } from "react";

/** Fixed-width column so sidebar labels line up. */
export function NavIconSlot({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-[18px] w-[22px] shrink-0 items-center justify-center">
      {children}
    </span>
  );
}

/** Stroke dashboard mark — matches Settings-style nav icons. */
export function OverviewNavIcon({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="3" y="3" width="8" height="8" rx="1" />
      <rect x="13" y="3" width="8" height="5" rx="1" />
      <rect x="13" y="10" width="8" height="11" rx="1" />
      <rect x="3" y="13" width="8" height="8" rx="1" />
    </svg>
  );
}
