"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PeriodSelector } from "@/components/analytics/period-selector";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/ui/kpi-card";
import type { AnalyticsPeriod, BusinessAnalyticsReport } from "@/lib/analytics";
import { formatCurrency, formatNumber, formatShortDate } from "@/lib/format";

export function AnalyticsDashboard({
  report,
  period,
  onPeriodChange,
  loading,
  error,
}: {
  report: BusinessAnalyticsReport | null;
  period: AnalyticsPeriod;
  onPeriodChange: (p: AnalyticsPeriod) => void;
  loading?: boolean;
  error?: string;
}) {
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (loading && !report) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-kova-border/60" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-lg bg-kova-border/50"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <p className="text-sm text-kova-muted">
        Analytics will appear when your business has activity to measure.
      </p>
    );
  }

  const { kpis, currency, availability, series, products, leads, marketing } =
    report;

  const orderSeries = series.orders_by_day.map((row) => ({
    date: formatShortDate(row.date),
    orders: row.count,
  }));

  const expenseSeries = series.expenses_by_day.map((row) => ({
    date: formatShortDate(row.date),
    amount: Number(row.amount),
  }));

  const leadSeries = series.leads_by_day.map((row) => ({
    date: formatShortDate(row.date),
    leads: row.count,
  }));

  const funnelData = [
    { stage: "New", count: leads.funnel.new ?? 0 },
    { stage: "Contacted", count: leads.funnel.contacted ?? 0 },
    { stage: "Qualified", count: leads.funnel.qualified ?? 0 },
    { stage: "Converted", count: leads.funnel.converted ?? 0 },
  ].filter((row) => row.count > 0);

  const topProducts = products.top_by_order_volume.map((row) => ({
    name: row.name.length > 22 ? `${row.name.slice(0, 22)}…` : row.name,
    orders: row.orders,
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-kova-muted">
            {report.period.start} → {report.period.end}
          </p>
          <p className="mt-0.5 text-xs text-kova-muted">
            {report.definitions.orders}
          </p>
        </div>
        <PeriodSelector
          value={period}
          onChange={onPeriodChange}
          disabled={loading}
        />
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Open orders"
          value={kpis.open_orders?.value ?? 0}
          hint="Awaiting fulfilment"
        />
        <KpiCard
          label="Store enquiries"
          value={kpis.orders_in_period?.value ?? 0}
          changePct={kpis.orders_in_period?.change_pct}
          hint="Excludes cancelled"
        />
        <KpiCard
          label="Delivered"
          value={kpis.orders_delivered?.value ?? 0}
          changePct={kpis.orders_delivered?.change_pct}
        />
        <KpiCard
          label="Expenses"
          value={formatCurrency(
            kpis.expenses_total?.value ?? 0,
            currency,
          )}
          changePct={kpis.expenses_total?.change_pct}
          hint="Logged cash-out"
        />
        <KpiCard
          label="New leads"
          value={kpis.new_leads?.value ?? 0}
          changePct={kpis.new_leads?.change_pct}
        />
        <KpiCard
          label="Active products"
          value={kpis.active_products?.value ?? 0}
        />
        <KpiCard
          label="Low stock"
          value={kpis.low_stock_count?.value ?? 0}
          hint="At or below 2 units"
        />
        <KpiCard
          label="Revenue"
          value="—"
          unavailable="Payments not connected — revenue is not tracked yet."
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartPanel title="Orders over time" subtitle="Store enquiries per day">
          {orderSeries.length === 0 ? (
            <Empty href="/workspace/commerce/orders" action="View orders" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={orderSeries}>
                <CartesianGrid stroke="#e5e7e5" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#68756e" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#68756e" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="orders"
                  stroke="#176B4D"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartPanel>

        <ChartPanel title="Expenses" subtitle={`${currency} per day`}>
          {expenseSeries.length === 0 ? (
            <Empty href="/workspace/commerce/expenses" action="Log expenses" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={expenseSeries}>
                <CartesianGrid stroke="#e5e7e5" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#68756e" />
                <YAxis tick={{ fontSize: 11 }} stroke="#68756e" />
                <Tooltip
                  formatter={(value: number) =>
                    formatCurrency(value, currency)
                  }
                />
                <Bar dataKey="amount" fill="#F4B183" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartPanel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartPanel title="Leads" subtitle="New leads per day">
          {leadSeries.length === 0 ? (
            <Empty href="/workspace/leads" action="View leads" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={leadSeries}>
                <CartesianGrid stroke="#e5e7e5" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#68756e" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#68756e" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="leads"
                  stroke="#176B4D"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartPanel>

        <ChartPanel
          title="Lead funnel"
          subtitle={
            leads.conversion_rate_pct !== null
              ? `Conversion ${leads.conversion_rate_pct}% (excl. lost)`
              : "Conversion —"
          }
        >
          {funnelData.length === 0 ? (
            <Empty href="/workspace/leads" action="Add leads" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={funnelData} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid stroke="#e5e7e5" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="stage"
                  width={72}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip />
                <Bar dataKey="count" fill="#176B4D" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartPanel>
      </div>

      <ChartPanel
        title="Products by enquiry volume"
        subtitle="Orders linked to a product in this period"
      >
        {topProducts.length === 0 ? (
          <Empty href="/workspace/commerce/products" action="Products" />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(180, topProducts.length * 36)}>
            <BarChart data={topProducts} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid stroke="#e5e7e5" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={96}
                tick={{ fontSize: 11 }}
              />
              <Tooltip />
              <Bar dataKey="orders" fill="#176B4D" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartPanel>

      <section className="rounded-lg border border-kova-border bg-kova-white px-4 py-4">
        <MarketingHeading availability={availability} marketing={marketing} />
        {availability.social_engagement ? (
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Object.entries(marketing.engagement_totals).map(([key, value]) => (
              <div key={key}>
                <dt className="text-xs capitalize text-kova-muted">{key}</dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums text-kova-dark">
                  {formatNumber(value)}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-3 text-sm text-kova-muted">
            Publish posts and sync metrics from connected social accounts to see
            engagement here. Workspace-only content counts:{" "}
            {marketing.content_published_in_workspace} marked published in KCOVA
            this period.
          </p>
        )}
      </section>

      {products.low_stock.length > 0 ? (
        <section className="rounded-lg border border-kova-orange/40 bg-kova-orange-soft/40 px-4 py-4">
          <h2 className="text-sm font-semibold text-kova-dark">Low stock</h2>
          <ul className="mt-3 space-y-2">
            {products.low_stock.map((product) => (
              <li key={product.id} className="flex items-center justify-between text-sm">
                <Link
                  href={`/workspace/commerce/products/${product.id}`}
                  className="font-medium text-kova-green hover:underline"
                >
                  {product.name}
                </Link>
                <Badge tone="warning">{product.stock ?? 0} left</Badge>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function MarketingHeading({
  availability,
  marketing,
}: {
  availability: BusinessAnalyticsReport["availability"];
  marketing: BusinessAnalyticsReport["marketing"];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="text-sm font-semibold text-kova-dark">Marketing</h2>
        <Badge tone="brand">{marketing.posts_published} posts synced</Badge>
        {(marketing as { storefront_views?: number }).storefront_views ? (
          <Badge tone="neutral">
            {(marketing as { storefront_views?: number }).storefront_views} store views
          </Badge>
        ) : null}
      {!availability.meta_reach ? (
        <Badge tone="neutral">Reach unavailable until Meta metrics sync</Badge>
      ) : null}
    </div>
  );
}

function ChartPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-kova-border bg-kova-white px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-kova-dark">{title}</h2>
        {subtitle ? (
          <p className="text-xs text-kova-muted">{subtitle}</p>
        ) : null}
      </div>
      <div className="mt-4 min-h-[200px] w-full min-w-0">{children}</div>
    </section>
  );
}

function Empty({ href, action }: { href: string; action: string }) {
  return (
    <p className="text-sm text-kova-muted">
      No data in this period.{" "}
      <Link href={href} className="font-semibold text-kova-green hover:underline">
        {action}
      </Link>
    </p>
  );
}
