import Link from "next/link";

export interface KovaStep {
  letter: string;
  title: string;
  description?: string;
  href: string;
  done?: boolean;
}

interface KovaStepsGuideProps {
  title?: string;
  steps: KovaStep[];
}

/**
 * Compact A → B → C strip (no large cards).
 */
export function KovaStepsGuide({
  title = "Next steps",
  steps,
}: KovaStepsGuideProps) {
  const nextIndex = steps.findIndex((s) => !s.done);

  return (
    <nav aria-label={title} className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        {title}
      </p>
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-2 text-sm">
        {steps.map((step, index) => {
          const isNext = index === nextIndex;
          return (
            <li key={step.letter} className="flex items-center gap-1">
              {index > 0 ? (
                <span className="px-0.5 text-gray-300" aria-hidden>
                  →
                </span>
              ) : null}
              <Link
                href={step.href}
                title={step.description}
                className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 transition ${
                  step.done
                    ? "text-kova-green hover:bg-kova-green/5"
                    : isNext
                      ? "bg-kova-orange/10 font-semibold text-kova-dark hover:bg-kova-orange/15"
                      : "text-gray-600 hover:bg-kova-background hover:text-kova-dark"
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    step.done
                      ? "bg-kova-green text-white"
                      : "bg-kova-orange/80 text-kova-dark"
                  }`}
                >
                  {step.done ? "✓" : step.letter}
                </span>
                <span>{step.title}</span>
              </Link>
            </li>
          );
        })}
      </ol>
      {nextIndex >= 0 && steps[nextIndex]?.description ? (
        <p className="text-xs leading-5 text-gray-500">
          {steps[nextIndex].description}
        </p>
      ) : null}
    </nav>
  );
}
