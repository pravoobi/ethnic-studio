"use client";

import { useImagePreview } from "./ImagePreviewModal";

/** Text link that opens the target in the shared preview modal instead of a new tab. */
export function PreviewLink({
  href,
  label,
  isVideo = false,
  className,
}: {
  href: string;
  label: string;
  isVideo?: boolean;
  className?: string;
}) {
  const { openPreview } = useImagePreview();
  return (
    <button type="button" onClick={() => openPreview(href, label, isVideo)} className={className}>
      {label}
    </button>
  );
}

/** Thumbnail that opens the same (larger) image in the shared preview modal on click. */
export function PreviewThumbnail({
  src,
  alt,
  label,
  className,
}: {
  src: string;
  alt: string;
  label?: string;
  className?: string;
}) {
  const { openPreview } = useImagePreview();
  return (
    <button
      type="button"
      onClick={() => openPreview(src, label ?? alt)}
      title={label ?? alt}
      className={`group relative overflow-hidden rounded-lg ${className ?? ""}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- external Cloudinary-hosted URL, not a static asset */}
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover transition duration-200 group-hover:scale-105 group-hover:brightness-95"
      />
      <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition duration-200 group-hover:bg-black/20 group-hover:opacity-100">
        <span className="rounded-full bg-white/90 p-1.5 text-xs shadow-sm">🔍</span>
      </span>
    </button>
  );
}
