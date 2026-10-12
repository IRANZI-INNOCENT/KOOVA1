"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/lib/auth-context";
import { getLinkedInBrain, type LinkedInBrainSnapshot } from "@/lib/professional";

export function LinkedInBrainCard({ topic }: { topic?: string }) {
  const { accessToken } = useAuth();
  const [brain, setBrain] = useState<LinkedInBrainSnapshot | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    getLinkedInBrain(accessToken, topic).then(setBrain);
  }, [accessToken, topic]);

  if (!brain) {
    return (
      <p className="text-sm text-kova-muted">Loading LinkedIn brain…</p>
    );
  }

  const { identity, voice, pillars, matched_pillar, linkedin_account } = brain;

  return (
    <section className="rounded-xl border border-kova-border bg-kova-cream/30 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-kova-green">
        LinkedIn brain
      </p>
      <p className="mt-1 text-sm text-kova-muted">
        Kova uses this on every plan, draft, brief, and autopilot run.
      </p>
      <dl className="mt-4 space-y-2 text-sm">
        <div>
          <dt className="font-medium text-kova-ink">Headline</dt>
          <dd className="text-kova-muted">{identity.headline || "—"}</dd>
        </div>
        {linkedin_account?.available && linkedin_account.headline && (
          <div>
            <dt className="font-medium text-kova-ink">LinkedIn headline</dt>
            <dd className="text-kova-muted">{linkedin_account.headline}</dd>
          </div>
        )}
        {linkedin_account?.available && (linkedin_account.positions?.length ?? 0) > 0 && (
          <div>
            <dt className="font-medium text-kova-ink">LinkedIn experience</dt>
            <dd className="text-kova-muted">
              {linkedin_account.positions?.slice(0, 3).join(" · ")}
            </dd>
          </div>
        )}
        <div>
          <dt className="font-medium text-kova-ink">Voice</dt>
          <dd className="text-kova-muted">{voice.summary}</dd>
        </div>
        {matched_pillar && topic && (
          <div>
            <dt className="font-medium text-kova-ink">Pillar for this topic</dt>
            <dd className="text-kova-green">{matched_pillar}</dd>
          </div>
        )}
      </dl>
      {pillars.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {pillars.map((pillar) => (
            <li
              key={pillar.name}
              className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-kova-ink ring-1 ring-kova-border"
            >
              {pillar.name}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
