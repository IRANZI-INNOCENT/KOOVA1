"use client";

import Link from "next/link";

import { WORKSPACE_PAGE } from "@/components/ui/page-header";

const SHOP_SECTIONS = [
  {
    href: "/workspace/commerce/products",
    title: "Products",
    description: "Your catalogue, prices, and stock.",
  },
  {
    href: "/workspace/commerce/snap-to-sell",
    title: "Snap to Sell",
    description: "Add items from a photo.",
  },
  {
    href: "/workspace/commerce/storefront",
    title: "Store",
    description: "Public page your customers open.",
  },
  {
    href: "/workspace/commerce/orders",
    title: "Orders",
    description: "Enquiries from your store and leads.",
  },
  {
    href: "/workspace/commerce/expenses",
    title: "Expenses",
    description: "Riders, packaging, and restock cash-out.",
  },
] as const;

export default function CommerceHubPage() {
  return (
    <div className={WORKSPACE_PAGE}>
      <div className="mx-auto max-w-3xl space-y-6">
        <CommerceIntro />
        <CommerceGrid />
      </div>
    </div>
  );
}

function CommerceIntro() {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-kova-dark">Shop</h1>
      <p className="mt-2 text-sm text-gray-600">
        Products, your public store, orders from customers, and day-to-day costs.
      </p>
    </div>
  );
}

function CommerceGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {SHOP_SECTIONS.map((section) => (
        <Link
          key={section.href}
          href={section.href}
          className="rounded-xl border border-kova-border bg-white p-4 transition hover:border-kova-orange/40 hover:shadow-sm"
        >
          <p className="text-sm font-semibold text-kova-dark">{section.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            {section.description}
          </p>
        </Link>
      ))}
    </div>
  );
}
