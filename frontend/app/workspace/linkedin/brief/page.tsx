"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { WorkspacePageFrame } from "@/components/workspace/workspace-page-frame";
import { useAuth } from "@/lib/auth-context";
import {
  generateWeeklyBrief,
  getLatestWeeklyBrief,
  type WeeklyBrief,
} from "@/lib/professional";

export default function LinkedInBriefPage() {
  const { accessToken } = useAuth();
  const [brief, setBrief] = useState<WeeklyBrief | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    getLatestWeeklyBrief(accessToken).then(setBrief);
  }, [accessToken]);

  async function regenerate() {
    if (!accessToken) return;
    setLoading(true);
    try {
      setBrief(await generateWeeklyBrief(accessToken));
    } finally {
      setLoading(false);
    }
  }

  return (
    <WorkspacePageFrame embedded requireBusiness={false}>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Weekly brief</h1>
          <Button type="button" disabled={loading} onClick={regenerate}>
            {loading ? "Generating…" : "Generate"}
          </Button>
        </div>

        {!brief && (
          <p className="mt-6 text-sm text-kova-muted">
            Generate your first LinkedIn week plan and nudges.
          </p>
        )}

        {brief && (
          <div className="mt-6 space-y-4 rounded-xl border border-kova-border bg-white p-5">
            <p className="text-sm text-kova-muted">
              Week of {brief.week_start} · {brief.status}
            </p>
            {brief.greeting && (
              <p className="text-lg font-medium">{brief.greeting}</p>
            )}
            {brief.status === "failed" && (
              <p className="text-sm text-red-600">{brief.error_message}</p>
            )}
            <pre className="overflow-x-auto whitespace-pre-wrap text-sm">
              {JSON.stringify(brief.sections, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </WorkspacePageFrame>
  );
}
