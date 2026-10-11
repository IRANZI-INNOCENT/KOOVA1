"use client";

export function PageSkeleton() {
  return (
    <div className="animate-pulse p-4 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="h-4 w-24 rounded bg-gray-200" />
        <div className="space-y-3">
          <div className="h-3 w-32 rounded bg-gray-200" />
          <div className="h-8 w-64 max-w-full rounded bg-gray-200" />
          <div className="h-4 w-96 max-w-full rounded bg-gray-200" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="h-36 rounded-lg bg-gray-200" />
          <div className="h-36 rounded-lg bg-gray-200" />
          <div className="h-36 rounded-lg bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-16 rounded-lg bg-gray-200"
        />
      ))}
    </div>
  );
}
