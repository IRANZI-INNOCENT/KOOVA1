import type { CSSProperties } from "react";

import type { CommercePage } from "@/lib/commerce";
import { mediaSrc } from "@/lib/media";

export const LAYOUT_PRESETS = [
  {
    id: "compact",
    label: "Compact catalog",
    blurb: "More products in each row.",
  },
  {
    id: "editorial",
    label: "Editorial",
    blurb: "Fewer, wider cards under the banner.",
  },
  {
    id: "whatsapp_first",
    label: "WhatsApp-first",
    blurb: "Contact line under the banner.",
  },
  {
    id: "gallery",
    label: "Gallery",
    blurb: "Large photos. Fits fashion and décor.",
  },
] as const;

export const FONT_PRESETS = [
  { id: "classic", label: "Classic", blurb: "Clean sans for everyday shops." },
  { id: "modern", label: "Modern", blurb: "Tighter, sharper product titles." },
  { id: "soft", label: "Soft", blurb: "Rounder, friendlier type." },
] as const;

export type LayoutPresetId = (typeof LAYOUT_PRESETS)[number]["id"];
export type FontPresetId = (typeof FONT_PRESETS)[number]["id"];

/** Default KCOVA brand palette for storefronts. */
export const KCOVA_STORE_COLORS = {
  primary: "#176B4D",
  secondary: "#17211D",
  accent: "#F4B183",
} as const;

const DEFAULT_PRIMARY = KCOVA_STORE_COLORS.primary;
const DEFAULT_SECONDARY = KCOVA_STORE_COLORS.secondary;
const DEFAULT_ACCENT = KCOVA_STORE_COLORS.accent;

function parseHex(hex: string): [number, number, number] | null {
  const raw = hex.trim().replace(/^#/, "");
  if (!/^[0-9A-Fa-f]{6}$/.test(raw)) return null;
  return [
    parseInt(raw.slice(0, 2), 16),
    parseInt(raw.slice(2, 4), 16),
    parseInt(raw.slice(4, 6), 16),
  ];
}

/** Relative luminance 0–1 (sRGB). */
function luminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0.5;
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = rgb.map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Readable foreground for a solid brand fill. */
function onColor(hex: string): string {
  return luminance(hex) > 0.45 ? "#17211D" : "#FFFFFF";
}

/**
 * Map owner colors onto CSS variables with clear roles:
 * primary = chrome, secondary = support, accent = action.
 */
export function storeThemeStyle(
  page: Pick<
    CommercePage,
    "primary_color" | "secondary_color" | "accent_color" | "font_preset"
  >,
): CSSProperties {
  const primary = page.primary_color?.trim() || DEFAULT_PRIMARY;
  const secondary = page.secondary_color?.trim() || DEFAULT_SECONDARY;
  const accent = page.accent_color?.trim() || DEFAULT_ACCENT;
  const font =
    page.font_preset === "modern"
      ? "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
      : page.font_preset === "soft"
        ? "var(--font-display), Georgia, ui-serif, serif"
        : "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif";

  return {
    ["--store-primary" as string]: primary,
    ["--store-secondary" as string]: secondary,
    ["--store-accent" as string]: accent,
    ["--store-on-primary" as string]: onColor(primary),
    ["--store-on-secondary" as string]: onColor(secondary),
    ["--store-on-accent" as string]: onColor(accent),
    ["--store-primary-soft" as string]: `color-mix(in srgb, ${primary} 12%, white)`,
    ["--store-secondary-soft" as string]: `color-mix(in srgb, ${secondary} 10%, white)`,
    ["--store-accent-soft" as string]: `color-mix(in srgb, ${accent} 22%, white)`,
    ["--store-surface" as string]: `color-mix(in srgb, ${secondary} 3%, #FAFAF8)`,
    ["--store-border" as string]: `color-mix(in srgb, ${secondary} 14%, #E5E7E5)`,
    ["--store-font" as string]: font,
    fontFamily: "var(--store-font)",
    letterSpacing:
      page.font_preset === "modern"
        ? "-0.02em"
        : page.font_preset === "soft"
          ? "0.01em"
          : "0",
    backgroundColor: "var(--store-surface)",
  };
}

export function resolveStoreImage(
  url: string | null | undefined,
): string {
  if (!url) return "";
  return mediaSrc(url);
}
