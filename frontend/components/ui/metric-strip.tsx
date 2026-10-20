export interface MetricItem {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "green" | "orange" | "default";
}

/** Compact KPI row — plain type, no tinted tiles. */
export function MetricStrip({ items }: { items: MetricItem[] }) {
  return (
    <div
      className="grid grid-cols-2 gap-x-6 gap-y-3 border-y border-kova-border py-3 sm:grid-cols-4"
      role="list"
    >
      {items.map((item) => (
        <div key={item.label} role="listitem" className="min-w-0">
          <p className="text-xs text-gray-500">{item.label}</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-kova-dark">
            {item.value}
          </p>
          {item.hint ? (
            <p className="mt-0.5 text-xs text-gray-500">{item.hint}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
