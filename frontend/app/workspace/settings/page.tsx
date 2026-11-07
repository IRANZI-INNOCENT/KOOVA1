"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { PageHeader, WORKSPACE_PAGE } from "@/components/ui/page-header";
import { authenticatedApiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  getBusinessPolicy,
  OPERATING_MODES,
  updateOperatingMode,
  type OperatingMode,
} from "@/lib/social";
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

        <OperatingModeCard />

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
                        className="inline-flex h-11 items-center rounded-md bg-kova-orange/15 px-3 text-xs font-bold text-kova-dark"
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

function OperatingModeCard() {
  const { businessId, accessToken, workspaceLoading } = useWorkspace();
  const [mode, setMode] = useState<OperatingMode>("assist");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (workspaceLoading || !businessId || !accessToken) return;
    const token = accessToken;
    const bizId = businessId;
    getBusinessPolicy(bizId, token)
      .then((policy) => {
        if (
          OPERATING_MODES.some(
            (item) => item.value === policy.social_operating_mode,
          )
        ) {
          setMode(policy.social_operating_mode);
        }
      })
      .catch(() => undefined);
  }, [workspaceLoading, businessId, accessToken]);

  async function choose(next: OperatingMode) {
    if (!businessId || !accessToken || next === mode) return;
    setBusy(true);
    setError("");
    try {
      const policy = await updateOperatingMode(businessId, next, accessToken);
      if (
        OPERATING_MODES.some(
          (item) => item.value === policy.social_operating_mode,
        )
      ) {
        setMode(policy.social_operating_mode);
      }
    } catch {
      setError("Could not update how KCOVA publishes.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-kova-border bg-white p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-kova-dark">Publishing</h2>
      <p className="mt-1 text-xs leading-5 text-gray-500">
        This is what KCOVA will do with posts and replies.
      </p>
      <div className="mt-3 space-y-2">
        {OPERATING_MODES.map((item) => (
          <button
            key={item.value}
            type="button"
            disabled={busy}
            onClick={() => void choose(item.value)}
            className={`block w-full rounded-md border px-3 py-3 text-left disabled:opacity-60 ${
              mode === item.value
                ? "border-kova-green bg-kova-green/5"
                : "border-kova-border bg-white"
            }`}
          >
            <span className="text-sm font-semibold text-kova-dark">
              {item.label}
            </span>
            <span className="mt-0.5 block text-xs leading-5 text-gray-500">
              {item.detail}
            </span>
          </button>
        ))}
      </div>
      {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
    </section>
  );
}
