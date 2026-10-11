"use client";

import { ApiError } from "@/lib/api";

interface InstagramProfessionalGuideProps {
  pageName?: string;
  onRetry?: () => void;
  variant?: "error" | "setup";
}

const META_BUSINESS_SUITE =
  "https://business.facebook.com/latest/settings/instagram_account";

export function InstagramProfessionalGuide({
  pageName,
  onRetry,
  variant = "setup",
}: InstagramProfessionalGuideProps) {
  const isError = variant === "error";

  return (
    <section
      className={`rounded-lg border px-5 py-5 ${
        isError
          ? "border-amber-200 bg-amber-50"
          : "border-kova-orange/30 bg-kova-orange/5"
      }`}
      aria-labelledby="instagram-setup-title"
    >
      <p
        id="instagram-setup-title"
        className={`text-sm font-semibold ${
          isError ? "text-amber-900" : "text-kova-dark"
        }`}
      >
        {isError
          ? "Instagram is not linked to your Facebook Page yet"
          : "Finish Instagram setup before connecting in Kova"}
      </p>

      <p className="mt-2 text-sm leading-6 text-gray-600">
        Kova connects Instagram through Meta the same way Meta Business Suite
        does: your Instagram must be a{" "}
        <span className="font-semibold text-kova-dark">
          Professional account
        </span>{" "}
        (Business or Creator) and linked to your Facebook Page
        {pageName ? (
          <>
            {" "}
            <span className="font-semibold text-kova-dark">
              {pageName}
            </span>
          </>
        ) : (
          ""
        )}
        .
      </p>

      <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-kova-dark">
        <li>
          <span className="font-semibold">On your phone (Instagram app)</span>
          <span className="mt-1 block text-gray-600">
            Profile → menu ☰ →{" "}
            <span className="font-medium">Account type and tools</span> →{" "}
            <span className="font-medium">
              Switch to professional account
            </span>{" "}
            → choose <span className="font-medium">Business</span> or{" "}
            <span className="font-medium">Creator</span>.
          </span>
        </li>
        <li>
          <span className="font-semibold">
            Link Instagram to your Facebook Page
          </span>
          <span className="mt-1 block text-gray-600">
            In Meta Business Suite, open Page settings → Instagram → connect
            the same account you use for your shop. Or in the Instagram app:
            Profile → Edit profile →{" "}
            <span className="font-medium">Page</span> → connect your Page.
          </span>
          <a
            href={META_BUSINESS_SUITE}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm font-semibold text-kova-green hover:underline"
          >
            Open Meta Business Suite settings
          </a>
        </li>
        <li>
          <span className="font-semibold">Back in Kova</span>
          <span className="mt-1 block text-gray-600">
            Wait a minute for Meta to sync, then click{" "}
            <span className="font-medium">Connect Instagram</span> again. Use
            the Facebook login that is admin on both the Page and Instagram.
          </span>
        </li>
      </ol>

      {onRetry && (
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-10 items-center rounded-lg bg-kova-orange px-4 text-sm font-bold text-kova-dark transition hover:bg-[#f0a46e]"
          >
            Connect Instagram again
          </button>
        </div>
      )}
    </section>
  );
}

export function isInstagramNotLinkedError(
  error: unknown,
): boolean {
  if (error instanceof ApiError) {
    if (
      typeof error.details === "object" &&
      error.details !== null &&
      "error_code" in error.details &&
      (error.details as { error_code?: string })
        .error_code === "INSTAGRAM_NOT_LINKED_TO_PAGE"
    ) {
      return true;
    }
  }

  if (error instanceof Error) {
    return error.message
      .toLowerCase()
      .includes(
        "no instagram professional account is linked",
      );
  }

  return false;
}

export function instagramNotLinkedPageName(
  error: unknown,
): string | undefined {
  if (
    error instanceof ApiError &&
    typeof error.details === "object" &&
    error.details !== null &&
    "page_name" in error.details
  ) {
    const name = (error.details as { page_name?: string })
      .page_name;
    return name?.trim() || undefined;
  }

  return undefined;
}
