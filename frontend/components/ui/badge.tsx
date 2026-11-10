import type { ReactNode } from "react";

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "brand";

const toneClass: Record<BadgeTone, string> = {
  neutral: "bg-gray-100 text-kova-muted ring-gray-200",
  success: "bg-emerald-50 text-kova-green ring-emerald-100",
  warning: "bg-kova-orange-soft text-[#8a5a2e] ring-kova-orange/30",
  danger: "bg-red-50 text-red-700 ring-red-100",
  brand: "bg-kova-green/10 text-kova-green ring-kova-green/20",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${toneClass[tone]}`}
    >
      {children}
    </span>
  );
}
