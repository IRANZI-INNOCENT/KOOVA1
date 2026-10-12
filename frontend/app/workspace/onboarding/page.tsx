"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/workspace/app-shell";
import { Button } from "@/components/ui/button";
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
}[] = [
  {
    path: "linkedin",
    title: "LinkedIn professional",
    description:
      "Plan topics, capture events, and manage your personal brand on LinkedIn.",
  },
  {
    path: "business",
    title: "Business workspace",
    description:
      "Run social, commerce, and your morning brief for a small business.",
  },
  {
    path: "both",
    title: "Both",
    description: "Use Kova for your company and your personal LinkedIn presence.",
  },
];

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
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-sm font-medium text-kova-green">Welcome to Kova</p>
        <h1 className="mt-2 text-2xl font-semibold text-kova-ink">
          What do you want to manage first?
        </h1>
        <p className="mt-2 text-sm text-kova-muted">
          You can add the other later. One account works for both.
        </p>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-1">
          {choices.map((item) => (
            <button
              key={item.path}
              type="button"
              disabled={saving !== null}
              onClick={() => choose(item.path)}
              className="rounded-xl border border-kova-border bg-white p-5 text-left shadow-sm transition hover:border-kova-green/40 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-kova-ink">{item.title}</h2>
                  <p className="mt-1 text-sm text-kova-muted">{item.description}</p>
                </div>
                <Button
                  type="button"
                  disabled={saving === item.path}
                  onClick={(e) => {
                    e.stopPropagation();
                    void choose(item.path);
                  }}
                >
                  {saving === item.path ? "Saving…" : "Continue"}
                </Button>
              </div>
            </button>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-kova-muted">
          Already set up?{" "}
          <Link href="/workspace" className="font-medium text-kova-green">
            Go to workspace
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
