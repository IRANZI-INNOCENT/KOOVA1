"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, WORKSPACE_PAGE } from "@/components/ui/page-header";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  completeLinkedInProfileSetup,
  createPillar,
  getProfessionalProfile,
  updateProfessionalProfile,
  type ProfessionalProfile,
} from "@/lib/professional";

export default function LinkedInSetupPage() {
  const router = useRouter();
  const { accessToken, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [pillarName, setPillarName] = useState("");
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!accessToken) {
      setLoadingProfile(false);
      setLoadError("Please sign in again to continue.");
      return;
    }

    setLoadingProfile(true);
    setLoadError("");

    try {
      const data = await getProfessionalProfile(accessToken);
      setProfile(data);
    } catch (err) {
      setProfile(null);
      setLoadError(
        err instanceof ApiError
          ? err.message
          : "Could not load your LinkedIn profile. Check your connection and try again.",
      );
    } finally {
      setLoadingProfile(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    void loadProfile();
  }, [authLoading, loadProfile]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !profile) return;

    setError("");
    setSaving(true);

    try {
      const headline = profile.headline.trim();
      const roleTitle = profile.role_title.trim();
      if (!headline || !roleTitle) {
        setError("Headline and role title are required.");
        return;
      }

      let current = await updateProfessionalProfile(accessToken, {
        headline,
        role_title: roleTitle,
        industry: profile.industry.trim(),
        tone_notes: profile.tone_notes.trim(),
      });

      if (current.pillars.length === 0) {
        const name = pillarName.trim();
        if (!name) {
          setError("Add at least one content pillar.");
          return;
        }
        await createPillar(accessToken, { name });
        current = await getProfessionalProfile(accessToken);
        setProfile(current);
      }

      const finished = await completeLinkedInProfileSetup(accessToken);
      if (!finished.profile_ready) {
        setError(
          "Add a headline, role title, and at least one content pillar.",
        );
        setProfile(finished);
        return;
      }

      setProfile(finished);
      router.replace("/workspace/linkedin");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not save your profile. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loadingProfile) {
    return (
      <div className={WORKSPACE_PAGE}>
        <div className="mx-auto max-w-lg">
          <p className="text-sm text-gray-500">Loading your profile…</p>
        </div>
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <div className={WORKSPACE_PAGE}>
        <div className="mx-auto max-w-lg space-y-4">
          <PageHeader
            eyebrow="LinkedIn setup"
            title="We could not load this page"
            description={loadError || "Something went wrong."}
          />
          <Button type="button" onClick={() => void loadProfile()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const pillars = profile.pillars;
  const showPillarInput = pillars.length === 0;

  return (
    <div className={WORKSPACE_PAGE}>
      <div className="mx-auto max-w-lg">
        <PageHeader
          eyebrow="LinkedIn setup"
          title="Tell Kova who you are on LinkedIn"
          description="About a minute — headline, role, and one content pillar so Kova can draft in your voice."
        />

        {error && (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input
            label="LinkedIn headline *"
            placeholder="What you want to be known for"
            value={profile.headline}
            onChange={(e) =>
              setProfile({ ...profile, headline: e.target.value })
            }
            required
          />
          <Input
            label="Role title *"
            placeholder="e.g. Product lead, Consultant, CS student"
            value={profile.role_title}
            onChange={(e) =>
              setProfile({ ...profile, role_title: e.target.value })
            }
            required
          />
          <Input
            label="Industry"
            placeholder="e.g. Fintech, AI, Healthcare"
            value={profile.industry}
            onChange={(e) =>
              setProfile({ ...profile, industry: e.target.value })
            }
          />
          <textarea
            className="min-h-[88px] w-full rounded-lg border border-kova-border p-3 text-sm"
            placeholder="Tone & boundaries (optional) — humor, no client names, etc."
            value={profile.tone_notes}
            onChange={(e) =>
              setProfile({ ...profile, tone_notes: e.target.value })
            }
          />

          <div>
            <p className="text-sm font-medium text-kova-dark">
              Content pillar *{" "}
              <span className="font-normal text-gray-500">(at least one)</span>
            </p>
            {pillars.length > 0 ? (
              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                {pillars.map((p) => (
                  <li key={p.id} className="rounded-md bg-kova-background px-2 py-1">
                    {p.name}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-2">
                <Input
                  label="First pillar"
                  placeholder="e.g. Agentic AI, Leadership, Startups"
                  value={pillarName}
                  onChange={(e) => setPillarName(e.target.value)}
                  required={showPillarInput}
                />
              </div>
            )}
          </div>

          <Button type="submit" className="w-full sm:w-auto" disabled={saving}>
            {saving ? "Saving…" : "Continue to LinkedIn workspace"}
          </Button>
        </form>
      </div>
    </div>
  );
}
