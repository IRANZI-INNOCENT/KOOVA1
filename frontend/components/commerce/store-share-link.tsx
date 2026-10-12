"use client";

import { useEffect, useState } from "react";

export function StoreShareLink({
  slug,
  published,
}: {
  slug: string;
  published: boolean;
}) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState("");

  useEffect(() => {
    setUrl(`${window.location.origin}/store/${slug}`);
  }, [slug]);

  async function copyLink() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setShareError("Could not copy. Select the link and copy manually.");
    }
  }

  async function shareLink() {
    if (!url || !navigator.share) return;
    setShareError("");
    try {
      await navigator.share({
        title: "My shop",
        url,
      });
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        setShareError("Share was not available. Use copy link instead.");
      }
    }
  }

  const canShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <div className="mt-5 border-t border-kova-border pt-5">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
        Shop link
      </p>
      {!published && (
        <p className="mt-1 text-xs leading-5 text-amber-800">
          Publish your storefront so customers can open this link.
        </p>
      )}
      <div className="mt-2 flex items-stretch gap-2">
        <input
          type="text"
          readOnly
          value={url || `/store/${slug}`}
          className="min-w-0 flex-1 truncate rounded-md border border-kova-border bg-kova-background px-3 py-2 text-xs text-kova-dark"
          aria-label="Public shop URL"
          onFocus={(e) => e.target.select()}
        />
        <button
          type="button"
          onClick={() => void copyLink()}
          className="shrink-0 rounded-md border border-kova-border bg-white px-3 py-2 text-xs font-semibold text-kova-dark hover:border-kova-orange/50"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={url || `/store/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center rounded-md bg-kova-green px-4 text-xs font-bold text-white hover:bg-[#12563d]"
        >
          Open shop
        </a>
        {canShare && published && (
          <button
            type="button"
            onClick={() => void shareLink()}
            className="inline-flex h-9 items-center rounded-md border border-kova-border bg-white px-4 text-xs font-semibold text-kova-dark hover:border-kova-green"
          >
            Share…
          </button>
        )}
      </div>
      {shareError && (
        <p className="mt-2 text-xs text-red-600">{shareError}</p>
      )}
    </div>
  );
}
