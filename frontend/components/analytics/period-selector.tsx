import type { AnalyticsPeriod } from "@/lib/analytics";

const OPTIONS: { id: AnalyticsPeriod; label: string }[] = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "365d", label: "12 months" },
];

export function PeriodSelector({
  value,
  onChange,
  disabled,
}: {
  value: AnalyticsPeriod;
  onChange: (period: AnalyticsPeriod) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="inline-flex flex-wrap gap-1 rounded-lg border border-kova-border bg-kova-white p-1"
      role="tablist"
      aria-label="Reporting period"
    >
      {OPTIONS.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(option.id)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              active
                ? "bg-kova-green text-white"
                : "text-kova-muted hover:bg-kova-background"
            } disabled:opacity-50`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
