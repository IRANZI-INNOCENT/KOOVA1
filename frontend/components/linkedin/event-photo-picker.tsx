"use client";

import { useRef } from "react";

import { Button } from "@/components/ui/button";

export const MAX_EVENT_PHOTOS = 5;

export interface EventPhotoItem {
  file: File;
  previewUrl: string;
}

interface EventPhotoPickerProps {
  photos: EventPhotoItem[];
  onChange: (photos: EventPhotoItem[]) => void;
  disabled?: boolean;
}

function mergeFiles(existing: EventPhotoItem[], files: FileList | File[]) {
  const next = [...existing];
  for (const file of Array.from(files)) {
    if (!file.type.startsWith("image/")) continue;
    if (next.length >= MAX_EVENT_PHOTOS) break;
    next.push({ file, previewUrl: URL.createObjectURL(file) });
  }
  return next;
}

export function EventPhotoPicker({
  photos,
  onChange,
  disabled,
}: EventPhotoPickerProps) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  function removeAt(index: number) {
    const copy = [...photos];
    const [removed] = copy.splice(index, 1);
    if (removed?.previewUrl) {
      URL.revokeObjectURL(removed.previewUrl);
    }
    onChange(copy);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-kova-ink">
          Event photos{" "}
          <span className="font-normal text-kova-muted">
            (up to {MAX_EVENT_PHOTOS})
          </span>
        </p>
        <span className="text-xs text-kova-muted">
          {photos.length}/{MAX_EVENT_PHOTOS}
        </span>
      </div>

      {photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {photos.map((photo, index) => (
            <li key={photo.previewUrl} className="relative aspect-square">
              <img
                src={photo.previewUrl}
                alt=""
                className="h-full w-full rounded-lg border border-kova-border object-cover"
              />
              <button
                type="button"
                disabled={disabled}
                onClick={() => removeAt(index)}
                className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-xs font-bold text-white"
                aria-label="Remove photo"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={disabled || photos.length >= MAX_EVENT_PHOTOS}
          onChange={(e) => {
            if (!e.target.files?.length) return;
            onChange(mergeFiles(photos, e.target.files));
            e.target.value = "";
          }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          disabled={disabled || photos.length >= MAX_EVENT_PHOTOS}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            onChange(mergeFiles(photos, [file]));
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={disabled || photos.length >= MAX_EVENT_PHOTOS}
          onClick={() => galleryRef.current?.click()}
        >
          Upload photos
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || photos.length >= MAX_EVENT_PHOTOS}
          onClick={() => cameraRef.current?.click()}
        >
          Snap a photo
        </Button>
      </div>
      <p className="text-xs text-kova-muted">
        Photos publish with your main event post. Kova drafts copy tuned for
        LinkedIn&apos;s feed (strong hook, scannable lines, authentic detail).
      </p>
    </div>
  );
}
