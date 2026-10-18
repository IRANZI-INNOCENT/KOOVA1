import type { CSSProperties } from "react";

import type { CommercePage } from "@/lib/commerce";
import { mediaSrc } from "@/lib/media";

export const LAYOUT_PRESETS = [
  {
    id: "compact",
    label: "Compact catalog",
    blurb: "Dense product grid — great for many SKUs.",
  },
  {
    id: "editorial",
    label: "Editorial",
    blurb: "Hero story first, then a calmer product list.",
  },
  {
    id: "whatsapp_first",
    label: "WhatsApp-first",
    blurb: "Big order CTA above the fold for chat-heavy shops.",
  },
  {
    id: "gallery",
    label: "Gallery",
    blurb: "Large image cards — beauty, fashion, décor.",
  },
] as const;

export const FONT_PRESETS = [
  { id: "classic", label: "Classic", blurb: "Clean sans for everyday shops." },
  { id: "modern", label: "Modern", blurb: "Tighter, sharper product titles." },
  { id: "soft", label: "Soft", blurb: "Rounder, friendlier type." },
] as const;

export type LayoutPresetId = (typeof LAYOUT_PRESETS)[number]["id"];
export type FontPresetId = (typeof FONT_PRESETS)[number]["id"];

const DEFAULT_PRIMARY = "#176B4D";
const DEFAULT_ACCENT = "#F4B183";

export function storeThemeStyle(
  page: Pick<
    CommercePage,
    "primary_color" | "accent_color" | "font_preset"
  >,
): CSSProperties {
  const primary = page.primary_color?.trim() || DEFAULT_PRIMARY;
  const accent = page.accent_color?.trim() || DEFAULT_ACCENT;
  const font =
    page.font_preset === "modern"
      ? "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
      : page.font_preset === "soft"
        ? "var(--font-display), Georgia, ui-serif, serif"
        : "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif";

  return {
    ["--store-primary" as string]: primary,
    ["--store-accent" as string]: accent,
    ["--store-on-primary" as string]: "#ffffff",
    ["--store-on-accent" as string]: "#17211D",
    ["--store-font" as string]: font,
    fontFamily: "var(--store-font)",
  };
}

export function resolveStoreImage(
  url: string | null | undefined,
): string {
  if (!url) return "";
  return mediaSrc(url);
}
