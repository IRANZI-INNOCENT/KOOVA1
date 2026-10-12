"use client";

import { useEffect, useState } from "react";

import { MetricStrip } from "@/components/ui/metric-strip";
import { useAuth } from "@/lib/auth-context";
import { getBusiness } from "@/lib/commerce";
import { getActivity, type ActivitySnapshot } from "@/lib/operations";

export function ActivityBoard({
  title,
  intro,
}: {
  title: string;
  intro: string;
}) {
  const { accessToken, isAuthenticated } = useAuth();
  const [snapshot, setSnapshot] = useState<ActivitySnapshot | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;
    const token = accessToken;
    getBusiness(token)
      .then((business) => getActivity(business.id, token))
      .then(setSnapshot)
      .catch(() => setError("Could not load activity."));
  }, [accessToken, isAuthenticated]);

  const cards = snapshot
    ? [
        ["Published posts", String(snapshot.posts.published)],
        ["Scheduled", String(snapshot.posts.scheduled)],
        ["Failed sends", String(snapshot.posts.failed)],
        ["Reach", String(snapshot.posts.reach)],
        ["Likes", String(snapshot.posts.likes)],
        ["Comments", String(snapshot.posts.comments)],
        ["Clicks", String(snapshot.posts.clicks)],
        ["New leads", String(snapshot.leads.new)],
        ["New orders", String(snapshot.orders.new)],
        ["Buying messages", String(snapshot.messages.buying)],
        ["Enquiries that became orders", String(snapshot.converted_leads ?? 0)],
      ]
    : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-kova-orange">
          Results
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-kova-dark">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">{intro}</p>
      </header>
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {snapshot && (
        <MetricStrip
          items={cards.map(([label, value]) => ({
            label,
            value,
          }))}
        />
      )}
      {snapshot?.plan && (
        <p className="text-sm leading-6 text-kova-dark">{snapshot.plan}</p>
      )}
      {snapshot?.evidence && snapshot.evidence.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-kova-dark">Verified</h2>
          <ul className="mt-3 space-y-2">
            {snapshot.evidence.map((line) => (
              <li key={line} className="rounded-lg border border-kova-border bg-white px-4 py-3 text-sm text-kova-dark">
                {line}
              </li>
            ))}
          </ul>
        </section>
      )}
      {snapshot?.observations && snapshot.observations.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-kova-dark">Observed, not confirmed</h2>
          <ul className="mt-3 space-y-2">
            {snapshot.observations.map((line) => (
              <li key={line} className="rounded-lg border border-kova-border bg-white px-4 py-3 text-sm text-gray-600">
                {line}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
