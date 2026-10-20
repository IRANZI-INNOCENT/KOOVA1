"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { PageHeader, WORKSPACE_PAGE } from "@/components/ui/page-header";
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

const PRIMARY = [
  {
    href: "/workspace/settings/business",
    label: "Business",
    description: "Profile, customers, and goals",
  },
  {
    href: "/workspace/settings/business-brand",
    label: "Brand",
    description: "Voice and tone",
  },
  {
    href: "/workspace/settings/business-policy",
    label: "Rules",
    description: "Permissions and posting limits",
  },
  {
    href: "/workspace/settings/email",
    label: "Email",
    description: "Alerts and reports",
  },
] as const;

const ADVANCED = [
  {
    href: "/workspace/settings/business-market",
    label: "Market",
    description: "Optional research brief",
  },
  {
    href: "/workspace/linkedin",
    label: "LinkedIn",
    description: "Professional posts",
  },
  {
    href: "/workspace/social/channels",
    label: "Channels",
    description: "Facebook & Instagram",
  },
] as const;

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
    void loadProgress();
  }, [accessToken, isAuthenticated, businessId]);

  const completeCount =
    progress?.sections.filter((section) => section.complete).length ?? 0;
  const total = 6;
  const percent = total ? Math.round((completeCount / total) * 100) : 0;

  return (
    <div className={WORKSPACE_PAGE}>
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          title="Settings"
          description={business?.name}
          actions={
            progress ? (
              <div className="w-full sm:w-40">
                <div className="flex items-baseline justify-between text-xs text-gray-500">
                  <span>Setup</span>
                  <span className="font-semibold text-kova-dark">
                    {completeCount}/{total}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-kova-border">
                  <div
                    className="h-full rounded-full bg-kova-green"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            ) : undefined
          }
        />

        {!workspaceLoading && businesses.length > 1 ? (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-kova-dark">Companies</h2>
            <ul className="space-y-2">
              {businesses.map((item) => {
                const active = item.id === businessId;
                return (
                  <li
                    key={item.id}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3 ${
                      active
                        ? "border-kova-green/40 bg-kova-green/5"
                        : "border-kova-border bg-white"
                    }`}
                  >
                    <p className="font-semibold text-kova-dark">{item.name}</p>
                    {active ? (
                      <span className="text-xs font-bold text-kova-green">
                        Active
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void setActiveBusinessId(item.id)}
                        className="rounded-md bg-kova-orange/15 px-3 py-1.5 text-xs font-bold text-kova-dark"
                      >
                        Switch
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <section className="overflow-hidden rounded-lg border border-kova-border bg-white">
          {PRIMARY.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-kova-background/80 sm:px-5 ${
                index > 0 ? "border-t border-kova-border/70" : ""
              }`}
            >
              <div>
                <p className="text-sm font-semibold text-kova-dark">
                  {item.label}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">{item.description}</p>
              </div>
            </Link>
          ))}
        </section>

        <section>
          <p className="mb-2 text-xs font-medium text-gray-400">Advanced</p>
          <div className="overflow-hidden rounded-lg border border-kova-border bg-white">
            {ADVANCED.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-kova-background/80 sm:px-5 ${
                  index > 0 ? "border-t border-kova-border/70" : ""
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-kova-dark">
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {item.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
