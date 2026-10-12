"use client";

import {
  FORMAT_LABELS,
  POST_ROLE_LABELS,
  type TopicWeekPlan,
} from "@/lib/topic-week-types";

export function TopicWeekPlanView({ plan }: { plan: TopicWeekPlan }) {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-kova-green">
          Week plan
        </p>
        <h2 className="mt-1 text-xl font-semibold text-kova-ink">{plan.title}</h2>
        <p className="mt-1 text-sm text-kova-muted">
          Three posts with different jobs — edit drafts after you generate them.
        </p>
      </div>

      <ol className="space-y-3">
        {plan.posts.map((slot) => (
          <li
            key={slot.arc_index}
            className="rounded-xl border border-kova-border bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-kova-green/10 px-2 py-0.5 font-medium text-kova-green">
                {slot.suggested_day}
              </span>
              <span className="rounded-full bg-kova-cream px-2 py-0.5 font-medium text-kova-ink">
                {POST_ROLE_LABELS[slot.post_role] ?? slot.post_role}
              </span>
              <span className="text-kova-muted">
                {FORMAT_LABELS[slot.format] ?? slot.format}
              </span>
            </div>
            <h3 className="mt-2 font-semibold text-kova-ink">{slot.title}</h3>
            {slot.summary && (
              <p className="mt-1 text-sm leading-relaxed text-kova-muted">
                {slot.summary}
              </p>
            )}
            {slot.hook_hint && (
              <p className="mt-2 border-l-2 border-kova-green/40 pl-3 text-sm italic text-kova-ink">
                Hook idea: {slot.hook_hint}
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
