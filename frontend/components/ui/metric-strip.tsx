export interface MetricItem {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "green" | "orange" | "default";
}

function toneClass(tone: MetricItem["tone"]) {
  if (tone === "green") return "text-kova-green";
  if (tone === "orange") return "text-kova-orange";
  return "text-kova-dark";
}

/** Compact row of KPIs — no oversized stat tiles. */
export function MetricStrip({ items }: { items: MetricItem[] }) {
  return (
    <div
      className="grid grid-cols-2 gap-2 md:grid-cols-4 sm:flex sm:flex-wrap sm:gap-0 sm:divide-x sm:divide-kova-border/70 sm:overflow-hidden sm:rounded-md sm:border sm:border-kova-border/80 sm:bg-white/90"
      role="list"
    >
      {items.map((item) => (
        <div
          key={item.label}
          role="listitem"
          className="rounded-md border border-kova-border/60 bg-white px-3 py-2 sm:min-w-[7.5rem] sm:flex-1 sm:rounded-none sm:border-0 sm:px-4 sm:py-2.5"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            {item.label}
          </p>
          <p
            className={`text-lg font-bold leading-tight tabular-nums ${toneClass(item.tone)}`}
          >
            {item.value}
          </p>
          {item.hint ? (
            <p className="mt-0.5 text-[11px] leading-snug text-gray-500">
              {item.hint}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
