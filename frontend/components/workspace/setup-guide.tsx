"use client";

import { SETUP_LABELS, SETUP_SECTIONS, type SetupSection } from "@/lib/setup-flow";

export function SetupGuide({
  section,
  isSetup,
  autoState,
  drafting,
  draftError,
  onDraft,
}: {
  section: SetupSection;
  isSetup: boolean;
  autoState: "idle" | "saving" | "saved";
  drafting: boolean;
  draftError: string;
  onDraft: () => void;
}) {
  const stepIndex = SETUP_SECTIONS.indexOf(section);

  return (
    <div className="mt-6 border border-kova-border bg-white p-4">
      {isSetup ? (
        <p className="text-xs text-gray-500">
          Setup {stepIndex + 2} of {SETUP_SECTIONS.length + 1} ·{" "}
          {SETUP_LABELS[section]}
        </p>
      ) : null}
      <div
        className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${
          isSetup ? "mt-2" : ""
        }`}
      >
        <p className="max-w-xl text-sm text-gray-600">
          Draft from your setup — edit anything before you continue.
        </p>
        <button
          type="button"
          onClick={onDraft}
          disabled={drafting}
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-kova-orange px-4 text-sm font-semibold text-kova-dark hover:bg-[#f0a46e] disabled:opacity-60"
        >
          {drafting ? "Drafting..." : "Ask Kova to draft this"}
        </button>
      </div>
      {draftError && (
        <p className="mt-3 text-sm text-red-700">{draftError}</p>
      )}
      {autoState !== "idle" && (
        <p className="mt-3 text-xs text-gray-500">
          {autoState === "saving" ? "Saving..." : "Saved. You can leave and come back."}
        </p>
      )}
    </div>
  );
}
