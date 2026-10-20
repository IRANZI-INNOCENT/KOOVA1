export interface ActivityItem {
  id: number;
  action_type: string;
  action_status: string;
  intent: string;
  result?: string;
  created_at?: string;
}

function activityKey(item: ActivityItem) {
  return [
    item.action_type,
    item.action_status,
    item.intent.trim(),
    (item.result ?? "").trim(),
  ].join("|");
}

/** Drop back-to-back duplicate log lines (same type, status, intent, result). */
export function dedupeActivities<T extends ActivityItem>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = activityKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function formatType(raw: string) {
  return raw.replace(/_/g, " ");
}

function statusClass(status: string) {
  if (status === "completed") return "text-kova-green";
  if (status === "failed") return "text-red-600";
  return "text-gray-500";
}

interface ActivityColumnsProps {
  title?: string;
  items: ActivityItem[];
  /** 2 on tablet, 3 on wide screens */
  columns?: 2 | 3;
  maxItems?: number;
}

export function ActivityColumns({
  title = "Recent activity",
  items,
  columns = 2,
  maxItems = 12,
}: ActivityColumnsProps) {
  const unique = dedupeActivities(items).slice(0, maxItems);
  if (unique.length === 0) return null;

  const gridClass =
    columns === 3
      ? "sm:grid-cols-2 lg:grid-cols-3"
      : "sm:grid-cols-2";

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-kova-dark">{title}</h2>
        {items.length > unique.length ? (
          <span className="text-xs text-gray-400">
            {unique.length} unique · {items.length - unique.length} duplicate
            {items.length - unique.length === 1 ? "" : "s"} hidden
          </span>
        ) : null}
      </div>
      <ul className={`mt-2 grid gap-2 ${gridClass}`}>
        {unique.map((action) => (
          <li
            key={action.id}
            className="rounded-md border border-kova-border/70 bg-white px-3 py-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="truncate text-xs font-medium text-gray-500">
                {formatType(action.action_type)}
              </span>
              <span
                className={`shrink-0 text-xs font-medium ${statusClass(action.action_status)}`}
              >
                {action.action_status}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-kova-dark">
              {action.intent}
            </p>
            {action.result ? (
              <p className="mt-0.5 truncate text-[11px] text-gray-500">
                {action.result}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
