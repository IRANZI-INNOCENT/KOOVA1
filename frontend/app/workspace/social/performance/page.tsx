"use client";

import { ActivityBoard } from "@/components/workspace/activity-board";

export default function PerformancePage() {
  return (
    <div className="p-4 sm:p-8">
      <ActivityBoard
        title="Insights and recommendations"
        intro="Reach, likes, comments, clicks, leads, and orders from what Kova has published and recorded."
      />
    </div>
  );
}
