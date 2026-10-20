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

/** Plain text steps — no numbered circles. */
export function KovaStepsGuide({
  title = "Next steps",
  steps,
}: KovaStepsGuideProps) {
  const nextIndex = steps.findIndex((s) => !s.done);

  return (
    <nav aria-label={title} className="space-y-1.5">
      <p className="text-sm font-semibold text-kova-dark">{title}</p>
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
        {steps.map((step, index) => {
          const isNext = index === nextIndex;
          return (
            <li key={step.letter} className="flex items-center gap-1">
              {index > 0 ? (
                <span className="px-1 text-gray-300" aria-hidden>
                  ·
                </span>
              ) : null}
              <Link
                href={step.href}
                title={step.description}
                className={`px-1 py-0.5 transition ${
                  step.done
                    ? "text-kova-green line-through decoration-kova-green/40"
                    : isNext
                      ? "font-semibold text-kova-dark underline decoration-kova-orange underline-offset-4"
                      : "text-gray-600 hover:text-kova-dark"
                }`}
              >
                {step.title}
              </Link>
            </li>
          );
        })}
      </ol>
      {nextIndex >= 0 && steps[nextIndex]?.description ? (
        <p className="text-xs text-gray-500">{steps[nextIndex].description}</p>
      ) : null}
    </nav>
  );
}
