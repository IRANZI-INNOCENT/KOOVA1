"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { AppShell } from "@/components/workspace/app-shell";
import { WorkspaceSectionNav } from "@/components/workspace/workspace-section-nav";

const TABS = [
  { href: "/workspace/commerce/products", label: "Products" },
  { href: "/workspace/commerce/storefront", label: "Store" },
  { href: "/workspace/commerce/orders", label: "Orders" },
  { href: "/workspace/commerce/expenses", label: "Expenses" },
] as const;

export default function CommerceLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const snap = pathname.startsWith("/workspace/commerce/snap-to-sell");

  return (
    <AppShell>
      <div className="flex min-h-0 flex-1 flex-col">
        {snap ? null : (
          <WorkspaceSectionNav
            ariaLabel="Shop sections"
            tabs={TABS}
          />
        )}
        <div className="flex-1 overflow-y-auto bg-kova-background">
          {children}
        </div>
      </div>
    </AppShell>
  );
}
