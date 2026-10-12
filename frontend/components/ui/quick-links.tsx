import Link from "next/link";

export interface QuickLinkItem {
  label: string;
  href: string;
  accent?: "green" | "orange" | "default";
}

const accentClass: Record<NonNullable<QuickLinkItem["accent"]>, string> = {
  green: "text-kova-green",
  orange: "text-kova-orange",
  default: "text-kova-dark",
};

/** Inline shortcuts — not full-width cards. */
export function QuickLinks({ links }: { links: QuickLinkItem[] }) {
  return (
    <nav
      aria-label="Shortcuts"
      className="flex flex-wrap gap-x-5 gap-y-2 border-y border-kova-border/60 py-3 text-sm"
    >
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`font-semibold hover:underline ${accentClass[link.accent ?? "default"]}`}
        >
          {link.label} →
        </Link>
      ))}
    </nav>
  );
}
