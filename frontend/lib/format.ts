export function formatNumber(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits }).format(
    value,
  );
}

export function formatCurrency(
  amount: number | string,
  currency: string,
): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(value)) return `— ${currency}`;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.length === 3 ? currency : "KES",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function formatDelta(
  changePct: number | null | undefined,
): { label: string; tone: "up" | "down" | "flat" | "na" } {
  if (changePct === null || changePct === undefined) {
    return { label: "No prior data", tone: "na" };
  }
  if (changePct === 0) return { label: "0%", tone: "flat" };
  if (changePct > 0) return { label: formatPercent(changePct), tone: "up" };
  return { label: formatPercent(changePct), tone: "down" };
}

export function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
