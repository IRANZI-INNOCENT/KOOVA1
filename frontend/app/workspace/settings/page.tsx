"use client";

import Link from "next/link";
import { AppShell } from "@/components/workspace/app-shell";

const businessBrainSections = [
  {
    label: "Business Profile",
    title: "Tell Kova about your business",
    description:
      "Define what your business does, why it exists, who it serves, and how it creates value.",
    href: "/workspace/settings/business-profile",
  },
  {
    label: "Business Audience",
    title: "Define your customers",
    description:
      "Help Kova understand who your customers are, what they need, their pain points, and how they make buying decisions.",
    href: "/workspace/settings/business-audience",
  },
  {
    label: "Business Brand",
    title: "Define how your business communicates",
    description:
      "Set the voice, tone, personality, positioning, and communication style Kova should use when representing your business.",
    href: "/workspace/settings/business-brand",
  },
  {
    label: "Business Goals",
    title: "Define what your business wants to achieve",
    description:
      "Tell Kova your priorities, growth objectives, success measures, challenges, and strategic direction.",
    href: "/workspace/settings/business-goals",
  },
  {
    label: "Business Policies",
    title: "Define your business policies",
    description:
      "Define what Kova can do automatically and which actions require your approval.",
    href: "/workspace/settings/business-policy",
  },
];

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="p-6 sm:p-8">
        <div className="mx-auto max-w-5xl">
          <header>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-kova-green">
              Settings
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-kova-dark sm:text-4xl">
              Configure Kova
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
              Give Kova the information, preferences, and
              context it needs to understand and eventually
              operate your business.
            </p>
          </header>

          <section className="mt-12">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
              Business
            </p>

            <h2 className="mt-2 text-2xl font-semibold text-kova-dark">
              Business Brain
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
              Build the knowledge Kova uses to understand
              your business, your customers, your brand, and
              your goals.
            </p>

            <div className="mt-6 space-y-4">
              {businessBrainSections.map((section) => (
                <Link
                  key={section.href}
                  href={section.href}
                  className="block border border-kova-border bg-white p-6 transition-colors hover:border-kova-green hover:bg-kova-background"
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="max-w-2xl">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-kova-green">
                        {section.label}
                      </p>

                      <h3 className="mt-3 text-lg font-semibold text-kova-dark">
                        {section.title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-gray-500">
                        {section.description}
                      </p>
                    </div>

                    <span
                      aria-hidden="true"
                      className="shrink-0 text-sm font-semibold text-kova-green"
                    >
                      Configure →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="mt-10 border border-kova-border bg-kova-background p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-kova-green">
              Why this matters
            </p>

            <h2 className="mt-3 text-lg font-semibold text-kova-dark">
              Kova should understand before it acts.
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
              The Business Brain gives Kova structured context
              about the business. This context will eventually
              work together with products, policies,
              conversations, and other business activity so
              Kova can make better decisions when creating
              content, engaging customers, generating leads,
              and supporting sales.
            </p>
          </section>
        </div>
      </div>
    </AppShell>
  );
}