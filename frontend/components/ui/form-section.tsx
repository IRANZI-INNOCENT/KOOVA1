import type { ReactNode } from "react";

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

/** Settings / long forms — section divider, not a heavy card. */
export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <section className="space-y-4 border-b border-kova-border pb-8 last:border-b-0 last:pb-0">
      <div>
        <h2 className="text-base font-semibold text-kova-dark">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-gray-500">{description}</p>
        ) : null}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
