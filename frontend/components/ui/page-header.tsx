import type { ReactNode } from "react";

/** Standard workspace page width and padding. */
export const WORKSPACE_PAGE =
  "mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:px-8 sm:py-8";

interface PageHeaderProps {
  /** Optional — skip when the topbar already names the section. */
  eyebrow?: string;
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
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-xs font-medium text-gray-500">{eyebrow}</p>
        ) : null}
        <h1
          className={`text-2xl font-semibold tracking-tight text-kova-dark sm:text-3xl ${
            eyebrow ? "mt-1" : ""
          }`}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-xl text-sm leading-6 text-gray-500">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
