export type PlatformBrand =
  | "facebook_page"
  | "facebook"
  | "instagram"
  | "linkedin"
  | "whatsapp";

/** Map inbox / API channel slugs to brand keys. */
export function channelToPlatformBrand(channel: string): PlatformBrand {
  if (channel === "facebook" || channel === "facebook_page") {
    return "facebook_page";
  }
  if (channel === "instagram") return "instagram";
  if (channel === "linkedin") return "linkedin";
  if (channel === "whatsapp") return "whatsapp";
  return normalizePlatform(channel);
}

function normalizePlatform(platform: string): PlatformBrand {
  if (platform === "facebook_page" || platform === "facebook") {
    return "facebook_page";
  }
  if (
    platform === "instagram" ||
    platform === "linkedin" ||
    platform === "whatsapp"
  ) {
    return platform;
  }
  return "facebook_page";
}

/** Official-style platform marks (not generic letter placeholders). */
export function PlatformBrandIcon({
  platform,
  size = 20,
  className = "",
}: {
  platform: string;
  size?: number;
  className?: string;
}) {
  const key = normalizePlatform(platform);
  const common = { width: size, height: size, className, "aria-hidden": true };

  if (key === "facebook_page") {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <circle cx="12" cy="12" r="12" fill="#1877F2" />
        <path
          d="M13.5 7.5H15.5V5H13.5C11.01 5 9 7.01 9 9.5V11H7V13.5H9V19H12V13.5H14.5L15 11H12V9.75C12 9.06 12.56 8.5 13.5 8.5Z"
          fill="#fff"
        />
      </svg>
    );
  }

  if (key === "instagram") {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <defs>
          <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F58529" />
            <stop offset="50%" stopColor="#DD2A7B" />
            <stop offset="100%" stopColor="#8134AF" />
          </linearGradient>
        </defs>
        <rect width="24" height="24" rx="6" fill="url(#ig-grad)" />
        <rect
          x="6.5"
          y="6.5"
          width="11"
          height="11"
          rx="3"
          fill="none"
          stroke="#fff"
          strokeWidth="1.8"
        />
        <circle cx="12" cy="12" r="2.6" fill="none" stroke="#fff" strokeWidth="1.8" />
        <circle cx="16.8" cy="7.2" r="1.1" fill="#fff" />
      </svg>
    );
  }

  if (key === "linkedin") {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <rect width="24" height="24" rx="4" fill="#0A66C2" />
        <path
          fill="#fff"
          d="M6.5 9.5h2.8v9H6.5v-9zm1.4-4.5a1.6 1.6 0 110 3.2 1.6 1.6 0 010-3.2zM10.8 9.5h2.7v1.2h.04c.38-.72 1.3-1.48 2.68-1.48 2.87 0 3.4 1.89 3.4 4.35v4.91h-2.8v-4.35c0-1.04-.02-2.38-1.45-2.38-1.45 0-1.67 1.13-1.67 2.3v4.43h-2.8V9.5z"
        />
      </svg>
    );
  }

  if (key === "whatsapp") {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <circle cx="12" cy="12" r="12" fill="#25D366" />
        <path
          fill="#fff"
          d="M16.8 14.9c-.3-.15-1.7-.85-2-.95-.27-.1-.47-.15-.67.15-.2.3-.77.95-.95 1.15-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.48-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.05 1.02-1.05 2.5 0 1.47 1.07 2.9 1.22 3.1.15.2 2.1 3.2 5.08 4.48.71.31 1.26.49 1.69.63.71.23 1.35.2 1.86.12.57-.08 1.7-.7 1.94-1.37.24-.67.24-1.25.17-1.37-.07-.12-.27-.2-.57-.35z"
        />
      </svg>
    );
  }

  return null;
}

/** Inbox: Meta + WhatsApp channel marks. */
export function InboxNavIcon({ size = 11 }: { size?: number }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5" aria-hidden>
      <PlatformBrandIcon platform="instagram" size={size} />
      <PlatformBrandIcon platform="facebook_page" size={size} />
      <PlatformBrandIcon platform="whatsapp" size={size} />
    </span>
  );
}

/** Facebook + Instagram marks for workspace Social nav. */
export function SocialNavIcon({ size = 16 }: { size?: number }) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center"
      style={{ width: size + 6, height: size }}
      aria-hidden
    >
      <PlatformBrandIcon
        platform="facebook_page"
        size={size}
        className="absolute left-0 top-0"
      />
      <PlatformBrandIcon
        platform="instagram"
        size={size}
        className="absolute left-[7px] top-0 rounded-[3px] ring-1 ring-white/30"
      />
    </span>
  );
}
