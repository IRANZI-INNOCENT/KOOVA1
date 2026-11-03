"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/workspace/app-shell";
import { useAuth } from "@/lib/auth-context";
import {
  getOnboardingStatus,
  setOnboardingChoice,
  type OnboardingPath,
} from "@/lib/professional";

const choices: {
  path: OnboardingPath;
  title: string;
  description: string;
  mark: "person" | "shop" | "both";
}[] = [
  {
    path: "linkedin",
    title: "LinkedIn professional",
    description:
      "Plan topics, capture events, and manage your personal brand on LinkedIn.",
    mark: "person",
  },
  {
    path: "business",
    title: "Business workspace",
    description:
      "Run social, commerce, and your morning brief for a small business.",
    mark: "shop",
  },
  {
    path: "both",
    title: "Both",
    description:
      "Use KCOVA for your company and your personal LinkedIn presence.",
    mark: "both",
  },
];

function PathMark({ kind }: { kind: "person" | "shop" | "both" }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (kind === "person") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5.5 19.2c1.2-3 3.4-4.5 6.5-4.5s5.3 1.5 6.5 4.5" />
      </svg>
    );
  }
  if (kind === "shop") {
    return (
      <svg {...common}>
        <path d="M4 9.5 6 4.5h12l2 5" />
        <path d="M4 9.5h16v9.2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5Z" />
        <path d="M9 19.7v-5h6v5" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="9" cy="9" r="3" />
      <path d="M4.2 17.5c.8-2.2 2.3-3.3 4.8-3.3 1.2 0 2.2.3 3 .9" />
      <path d="M14 8.2h6.2M14 11.2h4.2M14 14.2h6.2M14 17.2h3.2" />
    </svg>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { accessToken, isAuthenticated, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<OnboardingPath | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading || !isAuthenticated || !accessToken) return;

    getOnboardingStatus(accessToken)
      .then((status) => {
        if (status.onboarding_path === "linkedin") {
          router.replace("/workspace/linkedin");
          return;
        }
        if (status.onboarding_path === "business" && status.has_business) {
          router.replace("/workspace");
          return;
        }
        if (status.onboarding_path === "business" && !status.has_business) {
          router.replace("/workspace/setup");
          return;
        }
        if (status.onboarding_path === "both") {
          if (!status.has_business) {
            router.replace("/workspace/setup?path=both");
            return;
          }
          router.replace("/workspace/linkedin");
        }
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [accessToken, authLoading, isAuthenticated, router]);

  async function choose(path: OnboardingPath) {
    if (!accessToken) return;
    setSaving(path);
    setError("");
    try {
      await setOnboardingChoice(accessToken, path);
      if (path === "linkedin") {
        router.push("/workspace/linkedin/setup");
        return;
      }
      if (path === "business") {
        router.push("/workspace/setup");
        return;
      }
      router.push("/workspace/setup?path=both");
    } catch {
      setError("Could not save your choice. Please try again.");
    } finally {
      setSaving(null);
    }
  }

  if (authLoading || loading) {
    return (
      <AppShell>
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-kova-muted">
          Loading…
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-kova-green">
          Welcome to KCOVA
        </p>
        <h1 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight text-kova-dark sm:text-4xl">
          What do you want to manage first?
        </h1>
        <p className="mt-3 max-w-xl text-base leading-7 text-gray-600">
          You can add the other later. One account works for both.
        </p>

        {error && (
          <p className="mt-6 max-w-xl rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {choices.map((item) => {
            const busy = saving === item.path;
            return (
              <button
                key={item.path}
                type="button"
                disabled={saving !== null}
                onClick={() => choose(item.path)}
                className="flex h-full flex-col rounded-xl border border-kova-orange bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kova-green focus-visible:ring-offset-2 disabled:translate-y-0 disabled:opacity-60"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-kova-orange-soft text-kova-green">
                  <PathMark kind={item.mark} />
                </span>
                <h2 className="mt-4 text-lg font-semibold text-kova-dark">
                  {item.title}
                </h2>
                <p className="mt-2 flex-1 text-sm leading-6 text-gray-600">
                  {item.description}
                </p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-kova-green">
                  {busy ? "Saving…" : "Continue"}
                  <span aria-hidden>{busy ? "" : "→"}</span>
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-8 text-sm text-gray-600">
          Already set up?{" "}
          <Link href="/workspace" className="font-semibold text-kova-green hover:underline">
            Go to workspace
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
