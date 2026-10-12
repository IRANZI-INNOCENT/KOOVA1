import Link from "next/link";
import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  /** When true, skip the dashed box — text and link only */
  minimal?: boolean;
  children?: ReactNode;
}

/** Compact empty state — default is inline, not a large card. */
export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  minimal = true,
  children,
}: EmptyStateProps) {
  const action =
    actionLabel && actionHref ? (
      <Link
        href={actionHref}
        className="mt-2 inline-flex text-sm font-semibold text-kova-green hover:underline"
      >
        {actionLabel} →
      </Link>
    ) : actionLabel && onAction ? (
      <button
        type="button"
        onClick={onAction}
        className="mt-2 text-sm font-semibold text-kova-green hover:underline"
      >
        {actionLabel} →
      </button>
    ) : null;

  if (minimal) {
    return (
      <div className="py-6 text-sm text-gray-500">
        <p className="font-medium text-kova-dark">{title}</p>
        {description && <p className="mt-1 leading-6">{description}</p>}
        {action}
        {children}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-kova-border px-5 py-6 text-center text-sm text-gray-500">
      <p className="font-medium text-kova-dark">{title}</p>
      {description && <p className="mt-2 leading-6">{description}</p>}
      {action}
      {children}
    </div>
  );
}
