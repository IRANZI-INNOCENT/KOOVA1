"use client";

import { AppShell } from "@/components/workspace/app-shell";
import { ActivityBoard } from "@/components/workspace/activity-board";

export default function AnalyticsPage() {
  return (
    <AppShell>
      <div className="p-4 sm:p-8">
        <ActivityBoard
          title="Analytics"
          intro="Orders, leads, published posts, and the response those posts have collected."
        />
      </div>
    </AppShell>
  );
}
