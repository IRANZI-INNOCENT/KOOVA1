"use client";

import { PageHeader, WORKSPACE_PAGE } from "@/components/ui/page-header";
import { AppShell } from "@/components/workspace/app-shell";
import { ActivityBoard } from "@/components/workspace/activity-board";

export default function AnalyticsPage() {
  return (
    <AppShell>
      <div className={WORKSPACE_PAGE}>
        <PageHeader
          eyebrow="Analytics"
          title="Reports (coming soon)"
          description="For now, use Overview and Social for posts and Leads for customers. Full charts are on the way."
        />
        <div className="mt-6">
          <ActivityBoard
            title="Recent activity"
            intro="Orders, leads, published posts, and replies in one feed."
          />
        </div>
      </div>
    </AppShell>
  );
}
