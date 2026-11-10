"use client";

import type { ReactNode } from "react";

import { trackStorefrontEvent, type StorefrontEventKind } from "@/lib/storefront-analytics";

export function StorefrontWhatsAppLink({
  slug,
  href,
  kind,
  children,
  className,
  style,
}: {
  slug: string;
  href: string;
  kind: StorefrontEventKind;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={style}
      onClick={() => trackStorefrontEvent(slug, kind)}
    >
      {children}
    </a>
  );
}
