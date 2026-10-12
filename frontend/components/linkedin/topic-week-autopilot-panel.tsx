"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProfessionalProfile } from "@/lib/professional";

interface TopicWeekAutopilotPanelProps {
  profile: ProfessionalProfile;
  saving: boolean;
  running: boolean;
  onProfileChange: (next: ProfessionalProfile) => void;
  onSave: () => void;
  onRunNow: () => void;
}

export function TopicWeekAutopilotPanel({
  profile,
  saving,
  running,
  onProfileChange,
  onSave,
  onRunNow,
}: TopicWeekAutopilotPanelProps) {
  const enabled = profile.topic_autopilot_enabled;
  const lastRun = profile.topic_autopilot_last_run_at
    ? new Date(profile.topic_autopilot_last_run_at).toLocaleString()
    : null;

  return (
    <section className="rounded-xl border border-kova-border bg-gradient-to-br from-white to-kova-cream/30 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-kova-green">
            Topic autopilot
          </p>
          <h2 className="mt-1 text-lg font-semibold text-kova-ink">
            Continuous topic weeks
          </h2>
          <p className="mt-1 max-w-xl text-sm text-kova-muted">
            Each calendar week Kova picks a theme (your standing topic or top
            pillar), plans three posts, drafts them, and schedules Tue / Thu /
            Sat slots. Text posts publish on schedule when LinkedIn is connected;
            carousel outlines stay ready to copy.
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 rounded-full border border-kova-border bg-white px-3 py-2 text-sm font-medium">
          <input
            type="checkbox"
            className="h-4 w-4 accent-kova-green"
            checked={enabled}
            onChange={(e) =>
              onProfileChange({
                ...profile,
                topic_autopilot_enabled: e.target.checked,
              })
            }
          />
          Autopilot on
        </label>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Input
          label="Standing topic (optional)"
          placeholder="e.g. Agentic AI in production"
          value={profile.topic_autopilot_standing_topic ?? ""}
          onChange={(e) =>
            onProfileChange({
              ...profile,
              topic_autopilot_standing_topic: e.target.value,
            })
          }
        />
        <div className="flex flex-col justify-end gap-2 sm:flex-row">
          <Button type="button" variant="outline" disabled={saving} onClick={onSave}>
            {saving ? "Saving…" : "Save autopilot settings"}
          </Button>
          <Button type="button" disabled={running} onClick={onRunNow}>
            {running ? "Running…" : "Run cycle now"}
          </Button>
        </div>
      </div>

      {lastRun && (
        <p className="mt-3 text-xs text-kova-muted">Last autopilot run: {lastRun}</p>
      )}
      {enabled && (
        <p className="mt-2 text-xs text-kova-green">
          Worker checks every minute alongside scheduled publishing.
        </p>
      )}
    </section>
  );
}
