"use client";

import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkspacePageFrame } from "@/components/workspace/workspace-page-frame";
import { useAuth } from "@/lib/auth-context";
import { LinkedInBrainCard } from "@/components/linkedin/linkedin-brain-card";
import {
  createPillar,
  deletePillar,
  getProfessionalProfile,
  updateProfessionalProfile,
  type ContentPillar,
  type OperatingMode,
  type ProfessionalProfile,
} from "@/lib/professional";

export default function LinkedInProfilePage() {
  const { accessToken } = useAuth();
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [pillarName, setPillarName] = useState("");
  const [saving, setSaving] = useState(false);
  const [brainKey, setBrainKey] = useState(0);

  useEffect(() => {
    if (!accessToken) return;
    getProfessionalProfile(accessToken).then(setProfile);
  }, [accessToken]);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !profile) return;
    setSaving(true);
    const updated = await updateProfessionalProfile(accessToken, {
      headline: profile.headline,
      role_title: profile.role_title,
      industry: profile.industry,
      tone_notes: profile.tone_notes,
      operating_mode: profile.operating_mode,
    });
    setProfile(updated);
    setBrainKey((k) => k + 1);
    setSaving(false);
  }

  async function addPillar() {
    if (!accessToken || !pillarName.trim()) return;
    const pillar = await createPillar(accessToken, {
      name: pillarName.trim(),
    });
    setProfile((prev) =>
      prev
        ? { ...prev, pillars: [...prev.pillars, pillar] }
        : prev,
    );
    setPillarName("");
    setBrainKey((k) => k + 1);
  }

  async function removePillar(pillar: ContentPillar) {
    if (!accessToken) return;
    await deletePillar(accessToken, pillar.id);
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            pillars: prev.pillars.filter((p) => p.id !== pillar.id),
          }
        : prev,
    );
  }

  if (!profile) {
    return (
      <WorkspacePageFrame>
        <div className="p-8 text-sm text-kova-muted">Loading profile…</div>
      </WorkspacePageFrame>
    );
  }

  return (
    <WorkspacePageFrame>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Profile & pillars</h1>
        <p className="mt-1 text-sm text-kova-muted">
          This is your LinkedIn brain — topic weeks, event posts, and autopilot
          all pull from here.
        </p>
        <div className="mt-6">
          <LinkedInBrainCard key={brainKey} />
        </div>
        <form onSubmit={saveProfile} className="mt-8 space-y-4">
          <Input
            label="Headline"
            placeholder="Headline"
            value={profile.headline}
            onChange={(e) =>
              setProfile({ ...profile, headline: e.target.value })
            }
          />
          <Input
            label="Role title"
            placeholder="Role title"
            value={profile.role_title}
            onChange={(e) =>
              setProfile({ ...profile, role_title: e.target.value })
            }
          />
          <Input
            label="Industry"
            placeholder="Industry"
            value={profile.industry}
            onChange={(e) =>
              setProfile({ ...profile, industry: e.target.value })
            }
          />
          <textarea
            className="min-h-[100px] w-full rounded-lg border border-kova-border p-3 text-sm"
            placeholder="Tone and boundaries"
            value={profile.tone_notes}
            onChange={(e) =>
              setProfile({ ...profile, tone_notes: e.target.value })
            }
          />
          <label className="block text-sm font-medium">Operating mode</label>
          <select
            className="w-full rounded-lg border border-kova-border p-2 text-sm"
            value={profile.operating_mode}
            onChange={(e) =>
              setProfile({
                ...profile,
                operating_mode: e.target.value as OperatingMode,
              })
            }
          >
            <option value="approval">Approval — approve before schedule/publish</option>
            <option value="assist">Assist — lighter gates, you stay in control</option>
          </select>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </form>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">Content pillars (max 5)</h2>
          <ul className="mt-3 space-y-2">
            {profile.pillars.map((pillar) => (
              <li
                key={pillar.id}
                className="flex items-center justify-between rounded-lg border border-kova-border px-3 py-2"
              >
                <span>{pillar.name}</span>
                <button
                  type="button"
                  className="text-xs text-red-600"
                  onClick={() => removePillar(pillar)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          {profile.pillars.length < 5 && (
            <div className="mt-3 flex gap-2">
              <Input
                label="New pillar"
                placeholder="Pillar name"
                value={pillarName}
                onChange={(e) => setPillarName(e.target.value)}
              />
              <Button type="button" onClick={addPillar}>
                Add
              </Button>
            </div>
          )}
        </section>
      </div>
    </WorkspacePageFrame>
  );
}
