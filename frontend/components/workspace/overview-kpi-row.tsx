"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { KpiCard } from "@/components/ui/kpi-card";
import {
  getBusinessAnalytics,
  type BusinessAnalyticsReport,
} from "@/lib/analytics";
import { formatCurrency } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace-context";

export function OverviewKpiRow() {
  const { businessId, accessToken, workspaceLoading } = useWorkspace();
  const [report, setReport] = useState<BusinessAnalyticsReport | null>(null);

  useEffect(() => {
    if (workspaceLoading || !businessId || !accessToken) return;
    void getBusinessAnalytics(businessId, accessToken, "7d")
      .then(setReport)
      .catch(() => undefined);
  }, [accessToken, businessId, workspaceLoading]);

  if (!report) return null;

  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-kova-dark">Last 7 days</h2>
          <p className="text-xs text-kova-muted">From live store, lead, and expense records</p>
        </div>
        <Link
          href="/workspace/analytics"
          className="text-xs font-semibold text-kova-green hover:underline"
        >
          Full analytics
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Open orders"
          value={report.kpis.open_orders?.value ?? 0}
        />
        <KpiCard
          label="New enquiries"
          value={report.kpis.orders_in_period?.value ?? 0}
          changePct={report.kpis.orders_in_period?.change_pct}
        />
        <KpiCard
          label="New leads"
          value={report.kpis.new_leads?.value ?? 0}
          changePct={report.kpis.new_leads?.change_pct}
        />
        <KpiCard
          label="Expenses"
          value={formatCurrency(
            report.kpis.expenses_total?.value ?? 0,
            report.currency,
          )}
          changePct={report.kpis.expenses_total?.change_pct}
        />
      </div>
    </section>
  );
}
