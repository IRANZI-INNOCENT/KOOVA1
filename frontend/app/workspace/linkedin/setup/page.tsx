"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkspacePageFrame } from "@/components/workspace/workspace-page-frame";
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
  const { accessToken } = useAuth();
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [pillarName, setPillarName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    getProfessionalProfile(accessToken).then(setProfile);
  }, [accessToken]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !profile) return;

    setError("");
    setSaving(true);

    try {
      await updateProfessionalProfile(accessToken, {
        headline: profile.headline.trim(),
        role_title: profile.role_title.trim(),
        industry: profile.industry.trim(),
        tone_notes: profile.tone_notes.trim(),
      });

      if (profile.pillars.length === 0 && pillarName.trim()) {
        await createPillar(accessToken, { name: pillarName.trim() });
      }

      const finished = await completeLinkedInProfileSetup(accessToken);
      if (!finished.profile_ready) {
        setError(
          "Add a headline, role title, and at least one content pillar.",
        );
        setProfile(finished);
        return;
      }

      router.replace("/workspace/linkedin");
    } catch {
      setError("Could not save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return (
      <WorkspacePageFrame>
        <div className="p-8 text-sm text-kova-muted">Loading…</div>
      </WorkspacePageFrame>
    );
  }

  const pillars = profile.pillars;
  const showPillarInput = pillars.length === 0;

  return (
    <WorkspacePageFrame>
      <div className="mx-auto max-w-lg px-4 py-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-kova-green">
          LinkedIn setup
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-kova-ink">
          Tell Kova who you are on LinkedIn
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-kova-muted">
          This takes about a minute. Kova uses your headline, role, and content
          pillars to plan topic weeks and draft posts in your voice.
        </p>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
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
            <p className="text-sm font-medium text-kova-ink">
              Content pillar * <span className="font-normal text-kova-muted">(at least one)</span>
            </p>
            {pillars.length > 0 ? (
              <ul className="mt-2 space-y-1 text-sm text-kova-muted">
                {pillars.map((p) => (
                  <li key={p.id} className="rounded-md bg-kova-cream px-2 py-1">
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
    </WorkspacePageFrame>
  );
}
