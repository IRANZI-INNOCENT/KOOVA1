"use client";

export default function PostError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
      <p className="font-semibold text-kova-dark">Post hit a problem.</p>
      <p className="mt-1 text-sm text-gray-500">
        Reload this section to open it again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-kova-green px-4 text-sm font-semibold text-white"
      >
        Reload
      </button>
    </div>
  );
}
