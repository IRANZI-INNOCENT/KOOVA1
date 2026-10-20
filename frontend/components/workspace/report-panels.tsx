"use client";

import type { ReactNode } from "react";

import type {
  BriefItem,
  BriefMetric,
  BriefSections,
  MorningBrief,
  WeeklyReport,
  WeeklyReportSections,
} from "@/lib/brief";

function MetricRow({ metrics }: { metrics?: BriefMetric[] }) {
  if (!metrics?.length) return null;
  return (
    <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 border-y border-[#E5E7E5] py-3 sm:grid-cols-3">
      {metrics.map((metric) => (
        <div key={`${metric.label}-${metric.value}`}>
          <dt className="text-xs text-gray-500">{metric.label}</dt>
          <dd className="mt-0.5 text-lg font-semibold text-[#17211D]">
            {metric.value}
            {metric.change ? (
              <span className="ml-1 text-xs font-medium text-gray-500">
                {metric.change}
              </span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ItemList({ items }: { items?: BriefItem[] }) {
  if (!items?.length) return null;
  return (
    <ul className="mt-3 space-y-2">
      {items.map((item) => (
        <li
          key={`${item.title}-${item.description.slice(0, 24)}`}
          className="rounded-lg border border-[#E5E7E5] px-3 py-2.5"
        >
          <p className="text-sm font-medium text-[#17211D]">
            {item.priority === "high" ? (
              <span className="mr-2 text-xs font-semibold uppercase text-[#C45C26]">
                High
              </span>
            ) : null}
            {item.title}
          </p>
          {item.description ? (
            <p className="mt-1 text-sm leading-5 text-gray-500">
              {item.description}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function BulletList({ items }: { items?: string[] }) {
  if (!items?.length) return null;
  return (
    <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-5 text-gray-600">
      {items.map((item) => (
        <li key={item.slice(0, 48)}>{item}</li>
      ))}
    </ul>
  );
}

function SectionCard({
  title,
  summary,
  children,
}: {
  title: string;
  summary?: string;
  children?: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#E5E7E5] bg-white px-5 py-4">
      <h3 className="text-sm font-semibold text-[#17211D]">{title}</h3>
      {summary ? (
        <p className="mt-1 text-sm leading-6 text-gray-600">{summary}</p>
      ) : null}
      {children}
    </section>
  );
}

export function DailyBriefPanel({ brief }: { brief: MorningBrief }) {
  const sections = (brief.sections || {}) as Partial<BriefSections>;
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-gray-500">
          Daily · {brief.date}
        </p>
        <h2 className="mt-1 text-xl font-semibold text-[#17211D]">
          {brief.greeting || "Today’s brief"}
        </h2>
      </div>

      <SectionCard
        title="Pulse"
        summary={sections.pulse?.summary}
      >
        <MetricRow metrics={sections.pulse?.metrics} />
      </SectionCard>

      <SectionCard title="Needs attention" summary={sections.pending?.summary}>
        <ItemList items={sections.pending?.items} />
      </SectionCard>

      <SectionCard
        title="Opportunities"
        summary={sections.opportunities?.summary}
      >
        <ItemList items={sections.opportunities?.items} />
      </SectionCard>

      <SectionCard
        title="Performance"
        summary={sections.performance?.summary}
      >
        <BulletList items={sections.performance?.highlights} />
      </SectionCard>

      <SectionCard title="Today’s plan" summary={sections.plan?.summary}>
        <BulletList items={sections.plan?.steps} />
      </SectionCard>

      <SectionCard title="What Kova is doing">
        {sections.kova_actions?.completed?.length ? (
          <div className="mt-2">
            <p className="text-xs font-medium text-gray-500">Done</p>
            <BulletList items={sections.kova_actions.completed} />
          </div>
        ) : null}
        {sections.kova_actions?.planned?.length ? (
          <div className="mt-3">
            <p className="text-xs font-medium text-gray-500">Planned</p>
            <BulletList items={sections.kova_actions.planned} />
          </div>
        ) : null}
        {sections.kova_actions?.needs_approval?.length ? (
          <div className="mt-3">
            <p className="text-xs font-medium text-gray-500">Needs your OK</p>
            <BulletList items={sections.kova_actions.needs_approval} />
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}

export function WeeklyReportPanel({ report }: { report: WeeklyReport }) {
  const sections = (report.sections || {}) as Partial<WeeklyReportSections>;
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-gray-500">
          Weekly · week of {report.week_start}
        </p>
        <h2 className="mt-1 text-xl font-semibold text-[#17211D]">
          {report.greeting || "Week in review"}
        </h2>
        {sections.summary?.headline ? (
          <p className="mt-2 text-sm leading-6 text-gray-600">
            {sections.summary.headline}
          </p>
        ) : null}
        <MetricRow metrics={sections.summary?.metrics} />
      </div>

      <SectionCard title="Wins" summary={sections.wins?.summary}>
        <ItemList items={sections.wins?.items} />
      </SectionCard>

      <SectionCard title="Gaps" summary={sections.gaps?.summary}>
        <ItemList items={sections.gaps?.items} />
      </SectionCard>

      <SectionCard title="Channels" summary={sections.channels?.summary}>
        <BulletList items={sections.channels?.highlights} />
      </SectionCard>

      <SectionCard title="Commerce" summary={sections.commerce?.summary}>
        <BulletList items={sections.commerce?.highlights} />
      </SectionCard>

      <SectionCard title="Next week" summary={sections.next_week?.summary}>
        <BulletList items={sections.next_week?.steps} />
      </SectionCard>
    </div>
  );
}
