import type {
  InputHTMLAttributes,
} from "react";


/**
 * Props supported by the Kova Input component.
 */
interface InputProps
  extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
}


/**
 * Reusable Kova form input.
 *
 * The component owns the visual treatment of labels, inputs,
 * validation errors and supporting text so forms remain consistent
 * throughout the application.
 */
export function Input({
  label,
  error,
  helpText,
  id,
  className = "",
  ...props
}: InputProps) {
  return (
    <div className="w-full">

      {label ? (
        <label
          htmlFor={id}
          className="mb-2 block text-sm font-medium text-kova-dark"
        >
          {label}

          {props.required && (
            <span
              className="ml-1 text-kova-green"
              aria-hidden="true"
            >
              *
            </span>
          )}
        </label>
      ) : null}


      <input
        id={id}
        {...props}
        aria-invalid={Boolean(error)}
        aria-describedby={
          error
            ? `${id}-error`
            : helpText
              ? `${id}-help`
              : undefined
        }
        className={`
          w-full
          rounded-md
          border
          bg-white
          px-4
          py-3
          text-base
          text-kova-dark
          outline-none
          transition-colors
          placeholder:text-gray-400
          focus:border-kova-green
          focus:ring-1
          focus:ring-kova-green
          disabled:cursor-not-allowed
          disabled:bg-gray-100
          ${
            error
              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
              : "border-kova-border"
          }
          ${className}
        `}
      />


      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-2 text-xs text-red-600"
        >
          {error}
        </p>
      )}


      {!error && helpText && (
        <p
          id={`${id}-help`}
          className="mt-2 text-xs text-gray-500"
        >
          {helpText}
        </p>
      )}

    </div>
  );
}