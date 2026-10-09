import type {
  ButtonHTMLAttributes,
  ReactNode,
} from "react";


/**
 * Visual styles supported by the Kova Button component.
 *
 * Keeping button variants centralized ensures that actions across
 * the application use the same visual language.
 */
type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";


/**
 * Props accepted by the Kova Button component.
 */
interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  loading?: boolean;
}


/**
 * Base styles shared by every Kova button.
 */
const baseStyles =
  "inline-flex items-center justify-center gap-2 rounded-md border px-5 py-3 text-sm font-semibold transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-kova-green focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";


/**
 * Visual styles for each supported button variant.
 */
const variantStyles: Record<
  ButtonVariant,
  string
> = {
  primary:
    "border-kova-green bg-kova-green text-white hover:bg-[#12583f]",

  secondary:
    "border-kova-orange bg-kova-orange text-kova-dark hover:opacity-90",

  outline:
    "border-kova-border bg-white text-kova-dark hover:border-kova-green hover:text-kova-green",

  ghost:
    "border-transparent bg-transparent text-kova-dark hover:bg-kova-background",

  danger:
    "border-red-600 bg-red-600 text-white hover:bg-red-700",
};


/**
 * Reusable Kova button.
 *
 * All primary application actions should use this component instead
 * of defining button styling independently inside each page.
 */
export function Button({
  children,
  variant = "primary",
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`${baseStyles} ${variantStyles[variant]} ${props.className || ""}`}
    >
      {loading ? (
        <>
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />

          <span>
            Loading...
          </span>
        </>
      ) : (
        children
      )}
    </button>
  );
}