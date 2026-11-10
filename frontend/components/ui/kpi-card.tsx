import { formatDelta, formatNumber } from "@/lib/format";

export function KpiCard({
  label,
  value,
  hint,
  changePct,
  unavailable,
}: {
  label: string;
  value: number | string;
  hint?: string;
  changePct?: number | null;
  unavailable?: string;
}) {
  const delta = changePct !== undefined ? formatDelta(changePct) : null;
  const display =
    typeof value === "number" ? formatNumber(value) : value;

  return (
    <article className="rounded-lg border border-kova-border bg-kova-white px-4 py-3.5">
      <p className="text-xs font-medium text-kova-muted">{label}</p>
      {unavailable ? (
        <p className="mt-1.5 text-sm text-kova-muted">{unavailable}</p>
      ) : (
        <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-kova-dark">
          {display}
        </p>
      )}
      {hint ? (
        <p className="mt-1 text-[11px] leading-snug text-kova-muted">{hint}</p>
      ) : null}
      {delta && !unavailable ? (
        <p
          className={`mt-1.5 text-xs font-medium tabular-nums ${
            delta.tone === "up"
              ? "text-kova-green"
              : delta.tone === "down"
                ? "text-red-600"
                : delta.tone === "flat"
                  ? "text-kova-muted"
                  : "text-kova-muted"
          }`}
        >
          {delta.label} vs prior period
        </p>
      ) : null}
    </article>
  );
}
