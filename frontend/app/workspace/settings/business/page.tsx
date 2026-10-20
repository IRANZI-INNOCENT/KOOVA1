"use client";

import Link from "next/link";

import { PageHeader, WORKSPACE_PAGE } from "@/components/ui/page-header";

const SECTIONS = [
  {
    href: "/workspace/settings/business-profile",
    label: "Profile",
    description: "What you sell",
  },
  {
    href: "/workspace/settings/business-audience",
    label: "Customers",
    description: "Who you sell to",
  },
  {
    href: "/workspace/settings/business-goals",
    label: "Goals",
    description: "What success looks like",
  },
  {
    href: "/workspace/setup",
    label: "Basics",
    description: "Name, location, contact",
  },
] as const;

export default function BusinessSettingsHubPage() {
  return (
    <div className={WORKSPACE_PAGE}>
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader title="Business" />
        <div className="overflow-hidden rounded-lg border border-kova-border bg-white">
          {SECTIONS.map((section, index) => (
            <Link
              key={section.href}
              href={section.href}
              className={`flex items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-kova-background/80 sm:px-5 ${
                index > 0 ? "border-t border-kova-border/70" : ""
              }`}
            >
              <div>
                <p className="text-sm font-semibold text-kova-dark">
                  {section.label}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {section.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
