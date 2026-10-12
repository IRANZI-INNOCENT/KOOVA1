import type { ReactNode } from "react";

/** Standard workspace page width and padding. */
export const WORKSPACE_PAGE =
  "mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:px-8 sm:py-8";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

/**
 * Shared top-of-page header so every workspace screen reads the same way.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-kova-orange">
          {eyebrow}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-kova-dark sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            {description}
          </p>
        )}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
