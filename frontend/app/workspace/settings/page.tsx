"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, WORKSPACE_PAGE } from "@/components/ui/page-header";
import { KovaStepsGuide } from "@/components/workspace/kova-steps-guide";
import { authenticatedApiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useWorkspace } from "@/lib/workspace-context";

interface BrainProgress {
  next_href: string | null;
  sections: {
    key: string;
    complete: boolean;
    href: string;
  }[];
}

const businessBrainSections = [
  {
    key: "profile",
    label: "Business Profile",
    title: "Tell Kova about your business",
    description:
      "Define what your business does, why it exists, who it serves, and how it creates value.",
    href: "/workspace/settings/business-profile",
  },
  {
    key: "audience",
    label: "Business Audience",
    title: "Define your customers",
    description:
      "Help Kova understand who your customers are, what they need, their pain points, and how they make buying decisions.",
    href: "/workspace/settings/business-audience",
  },
  {
    key: "brand",
    label: "Business Brand",
    title: "Define how your business communicates",
    description:
      "Set the voice, tone, personality, positioning, and communication style Kova should use when representing your business.",
    href: "/workspace/settings/business-brand",
  },
  {
    key: "goals",
    label: "Business Goals",
    title: "Define what your business wants to achieve",
    description:
      "Tell Kova your priorities, growth objectives, success measures, challenges, and strategic direction.",
    href: "/workspace/settings/business-goals",
  },
  {
    key: "policy",
    label: "Business Policies",
    title: "Define your business policies",
    description:
      "Define what Kova can do automatically and which actions require your approval.",
    href: "/workspace/settings/business-policy",
  },
  {
    key: "market",
    label: "Market position",
    title: "See how the market sits around you",
    description:
      "Kova searches public pages for similar sellers, then writes a brief you can keep for later writing or leave unused.",
    href: "/workspace/settings/business-market",
  },
];

export default function SettingsPage() {
  const { accessToken, isAuthenticated } = useAuth();
  const {
    business,
    businesses,
    businessId,
    setActiveBusinessId,
    workspaceLoading,
  } = useWorkspace();
  const [progress, setProgress] = useState<BrainProgress | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !accessToken || !businessId) return;
    const token = accessToken;

    async function loadProgress() {
      try {
        const status = await authenticatedApiRequest<BrainProgress>(
          `/business-brain/${businessId}/progress/`,
          token,
        );
        setProgress(status);
      } catch {
        setProgress(null);
      }
    }

    loadProgress();
  }, [accessToken, isAuthenticated, businessId]);

  const completeCount =
    progress?.sections.filter((section) => section.complete).length ?? 0;
  const total = businessBrainSections.length;
  const percent = total ? Math.round((completeCount / total) * 100) : 0;

  const nextSection = progress?.sections.find((s) => !s.complete);

  return (
      <div className={WORKSPACE_PAGE}>
        <div className="mx-auto max-w-5xl space-y-6">
          <PageHeader
            eyebrow="Settings"
            title="Teach Kova about your business"
            description={
              business
                ? `Brain for ${business.name}. Switch brains in the top bar when you manage more than one company.`
                : "Short forms — do them once, update anytime."
            }
            actions={
              progress ? (
                <div className="w-full sm:w-44">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-bold uppercase tracking-[0.14em] text-gray-400">
                      Progress
                    </span>
                    <span className="font-semibold text-kova-dark">
                      {completeCount}/{total}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-kova-border">
                    <div
                      className="h-full rounded-full bg-kova-green"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              ) : undefined
            }
          />

          {nextSection && (
            <KovaStepsGuide
              title="Continue setup"
              steps={[
                {
                  letter: "1",
                  title: businessBrainSections.find((b) => b.key === nextSection.key)?.label ?? "Next section",
                  description: "Pick up where you left off.",
                  href: nextSection.href,
                },
              ]}
            />
          )}

          <div className="h-px bg-kova-border" />

          {!workspaceLoading && businesses.length > 1 && (
            <section className="space-y-3 rounded-lg border border-kova-border bg-white p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-kova-orange">
                  Your companies
                </p>
                <h2 className="mt-1 text-lg font-bold text-kova-dark">
                  Separate brains for separate businesses
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Each brain has its own profile, products, channels, and
                  autopilot. Pick one to edit settings below.
                </p>
              </div>
              <ul className="space-y-2">
                {businesses.map((item) => {
                  const active = item.id === businessId;
                  return (
                    <li
                      key={item.id}
                      className={`flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3 ${
                        active
                          ? "border-kova-green/40 bg-kova-green/5"
                          : "border-kova-border"
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-kova-dark">
                          {item.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.has_facebook_page
                            ? "Facebook Page connected"
                            : "No Facebook Page yet"}
                        </p>
                      </div>
                      {active ? (
                        <span className="text-xs font-bold text-kova-green">
                          Editing now
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void setActiveBusinessId(item.id)}
                          className="rounded-md bg-kova-orange/15 px-3 py-1.5 text-xs font-bold text-kova-dark"
                        >
                          Switch to this brain
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="space-y-4">
            <Link
              href="/workspace/setup"
              className="group flex items-start gap-4 rounded-lg border border-kova-border bg-white p-4 transition hover:-translate-y-0.5 hover:border-kova-orange/50 hover:shadow-sm sm:p-5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-kova-green text-sm font-bold text-white">
                B
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-kova-orange">
                  Business details
                </p>
                <h3 className="mt-1 text-base font-semibold text-kova-dark">
                  Name, phone, and contact
                </h3>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Update the business name, description, phone number, email, and location from the page you filled in when you signed up.
                </p>
              </div>
              <span className="inline-flex h-7 shrink-0 items-center rounded-md bg-kova-orange/15 px-2.5 text-xs font-bold text-kova-dark">
                Update
              </span>
            </Link>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-kova-orange">
                Business
              </p>
              <h2 className="mt-1 text-lg font-bold text-kova-dark">
                Business Brain
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Build the knowledge Kova uses to understand your business,
                your customers, your brand, and your goals.
              </p>
            </div>

            {progress?.next_href && (
              <Link
                href={progress.next_href}
                className="flex items-center gap-3 rounded-lg border border-kova-orange/40 bg-kova-orange/5 px-5 py-4 transition hover:border-kova-orange"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-kova-orange/20">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-kova-orange"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-kova-dark">
                    Continue business setup
                  </p>
                  <p className="text-xs text-gray-500">
                    Your progress is saved. Pick up at the next section.
                  </p>
                </div>
                <span className="inline-flex h-8 shrink-0 items-center rounded-md bg-kova-orange px-3 text-xs font-bold text-kova-dark">
                  Continue
                </span>
              </Link>
            )}

            <div className="space-y-3">
              {businessBrainSections.map((section, index) => {
                const status = progress?.sections.find(
                  (item) => item.key === section.key,
                );
                const complete = !!status?.complete;
                return (
                  <Link
                    key={section.href}
                    href={
                      status && !status.complete ? status.href : section.href
                    }
                    className="group flex items-start gap-4 rounded-lg border border-kova-border bg-white p-4 transition hover:-translate-y-0.5 hover:border-kova-orange/50 hover:shadow-sm sm:p-5"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-kova-orange/15 text-xs font-bold text-kova-dark">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-kova-orange">
                            {section.label}
                          </p>
                          <h3 className="mt-1 text-base font-semibold text-kova-dark">
                            {section.title}
                          </h3>
                        </div>
                        <span
                          className={`inline-flex h-7 shrink-0 items-center rounded-md px-2.5 text-xs font-bold ${
                            complete
                              ? "bg-kova-green/10 text-kova-green"
                              : "bg-kova-orange/15 text-kova-dark"
                          }`}
                        >
                          {complete ? "Done" : "Configure"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-gray-500">
                        {section.description}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <p className="text-sm leading-6 text-gray-500">
            The more Kova knows about your business, the better your posts,
            replies, and recommendations will be.
          </p>
        </div>
      </div>
  );
}