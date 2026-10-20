"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { PageHeader, WORKSPACE_PAGE } from "@/components/ui/page-header";
import { AppShell } from "@/components/workspace/app-shell";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  getEmailPreferences,
  getEmailPreferencesByToken,
  updateEmailPreferences,
  updateEmailPreferencesByToken,
  type EmailPreference,
} from "@/lib/notifications";

const TOGGLES: Array<{
  key: keyof Pick<
    EmailPreference,
    "account" | "alerts" | "commerce" | "reports"
  >;
  label: string;
  description: string;
}> = [
  {
    key: "account",
    label: "Account",
    description: "Welcome messages and account notices.",
  },
  {
    key: "alerts",
    label: "Alerts",
    description: "Failed posts, paused publishing, and approvals.",
  },
  {
    key: "commerce",
    label: "Commerce",
    description: "New leads and store orders.",
  },
  {
    key: "reports",
    label: "Reports",
    description: "Daily brief and weekly manager reports.",
  },
];

function EmailSettingsInner() {
  const { accessToken } = useAuth();
  const params = useSearchParams();
  const tokenParam = (params.get("token") || "").trim();

  const [prefs, setPrefs] = useState<EmailPreference | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = tokenParam
          ? await getEmailPreferencesByToken(tokenParam)
          : accessToken
            ? await getEmailPreferences(accessToken)
            : null;
        if (!data) {
          setError("Sign in or open the link from your email to manage preferences.");
          return;
        }
        if (!cancelled) setPrefs(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Unable to load email preferences.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [accessToken, tokenParam]);

  const toggle = async (key: (typeof TOGGLES)[number]["key"], value: boolean) => {
    if (!prefs) return;
    setSaving(true);
    setSuccess("");
    setError("");
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    try {
      const saved = tokenParam
        ? await updateEmailPreferencesByToken(tokenParam, { [key]: value })
        : accessToken
          ? await updateEmailPreferences(accessToken, { [key]: value })
          : null;
      if (saved) {
        setPrefs(saved);
        setSuccess("Preferences saved.");
      }
    } catch (err) {
      setPrefs(prefs);
      setError(
        err instanceof ApiError ? err.message : "Could not save preferences.",
      );
    } finally {
      setSaving(false);
    }
  };

  const body = (
    <div className={WORKSPACE_PAGE}>
      <PageHeader
        title="Email"
        description="Choose which emails you get. Password reset always sends when requested."
      />
      {error ? (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      ) : null}
      {loading ? (
        <div className="mt-8 h-40 animate-pulse rounded-xl bg-gray-100" />
      ) : prefs ? (
        <section className="mt-8 divide-y divide-[#E5E7E5] rounded-xl border border-[#E5E7E5] bg-white px-6">
          {prefs.email ? (
            <p className="py-4 text-sm text-gray-500">
              Managing emails for <span className="font-medium text-[#17211D]">{prefs.email}</span>
            </p>
          ) : null}
          {TOGGLES.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between gap-6 py-5"
            >
              <div>
                <p className="text-sm font-medium text-[#17211D]">{item.label}</p>
                <p className="mt-1 text-sm text-gray-500">{item.description}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={Boolean(prefs[item.key])}
                disabled={saving}
                onClick={() => void toggle(item.key, !prefs[item.key])}
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                  prefs[item.key] ? "bg-[#176B4D]" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                    prefs[item.key] ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );

  if (tokenParam && !accessToken) {
    return <main className="min-h-screen bg-[#F7F8F7]">{body}</main>;
  }

  return <AppShell>{body}</AppShell>;
}

export default function EmailSettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-500">Loading…</div>}>
      <EmailSettingsInner />
    </Suspense>
  );
}
