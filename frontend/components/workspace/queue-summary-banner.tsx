"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getWorkspaceQueue } from "@/lib/workspace-queue";
import { useWorkspace } from "@/lib/workspace-context";

export function QueueSummaryBanner() {
  const { businessId, accessToken, workspaceLoading } = useWorkspace();
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (workspaceLoading || !businessId || !accessToken) return;
    let cancelled = false;
    void getWorkspaceQueue(businessId, accessToken)
      .then((queue) => {
        if (!cancelled) setTotal(queue.counts.total);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [accessToken, businessId, workspaceLoading]);

  if (total === 0) return null;

  return (
    <Link
      href="/workspace/approvals"
      className="flex items-center justify-between gap-3 rounded-lg border border-kova-orange/50 bg-kova-orange-soft/60 px-4 py-3 transition hover:border-kova-orange"
    >
      <div>
        <p className="text-sm font-semibold text-kova-dark">
          {total === 1 ? "1 item needs you" : `${total} items need you`}
        </p>
        <p className="text-xs text-kova-muted">
          Posts, replies, and orders in one queue
        </p>
      </div>
      <span className="text-sm font-semibold text-kova-green">Open</span>
    </Link>
  );
}
