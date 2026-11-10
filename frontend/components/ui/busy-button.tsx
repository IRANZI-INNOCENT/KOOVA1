import type { ButtonHTMLAttributes, ReactNode } from "react";

type BusyButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  busy?: boolean;
  busyLabel?: string;
  children: ReactNode;
};

/** Small action control with spinner + disabled state while async work runs. */
export function BusyButton({
  busy = false,
  busyLabel = "Working…",
  children,
  className = "",
  disabled,
  ...props
}: BusyButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`inline-flex items-center justify-center gap-1.5 transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-70 ${className}`}
    >
      {busy ? (
        <>
          <span
            aria-hidden
            className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
          <span>{busyLabel}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
