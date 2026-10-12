import { PlatformBrandIcon } from "@/components/social/platform-brand";

interface PlatformAvatarProps {
  platform: string;
  imageUrl?: string | null;
  name?: string;
  size?: "sm" | "md" | "lg";
}

const SIZE = {
  sm: { box: "h-9 w-9", badge: 14, img: "h-9 w-9" },
  md: { box: "h-12 w-12", badge: 16, img: "h-12 w-12" },
  lg: { box: "h-14 w-14", badge: 18, img: "h-14 w-14" },
} as const;

/** Profile photo when available; otherwise the real platform logo. */
export function PlatformAvatar({
  platform,
  imageUrl,
  name,
  size = "md",
}: PlatformAvatarProps) {
  const dim = SIZE[size];
  const alt = name ? `${name} profile` : "Account";

  if (imageUrl?.trim()) {
    return (
      <div className={`relative shrink-0 ${dim.box}`}>
        <img
          src={imageUrl}
          alt={alt}
          referrerPolicy="no-referrer"
          className={`${dim.img} rounded-full object-cover ring-2 ring-kova-orange/25`}
        />
        <span
          className="absolute -bottom-0.5 -right-0.5 overflow-hidden rounded-full ring-2 ring-white"
          title={platform}
        >
          <PlatformBrandIcon platform={platform} size={dim.badge} />
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-2 ring-kova-orange/20 ${dim.box}`}
      title={name || platform}
    >
      <PlatformBrandIcon platform={platform} size={dim.badge + 6} />
    </div>
  );
}
