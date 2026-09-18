"use client";

import { useCallback, useEffect, useState } from "react";
import { buildGenBackgroundReplaceTransformation, buildGenRecolorTransformation, buildVideoTransformation } from "@/lib/cloudinary/transforms";
import { buildCloudinaryDeliveryUrl } from "@/lib/cloudinary/clientUrl";
import { BACKGROUND_PRESETS, RECOLOR_PALETTE, VIDEO_PRESET } from "@/lib/presets";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";

interface VariantItem {
  kind: "background" | "recolor" | "video";
  id: string;
  label: string;
  url: string;
}

const MEDIA_RETRY_DELAY_MS = 1500;
const MEDIA_MAX_RETRIES = 6;

/**
 * Generative transforms can report `status: "done"` (a real `secure_url`) before the asset is
 * actually fully available at the CDN — confirmed live 2026-09-18: freshly generated URLs
 * returned HTTP 423 (Locked) for several seconds immediately after `generateVariants()`
 * succeeded, then resolved to 200 without any change on our side. Retries by remounting the
 * element with a cache-busting query param (`key={attempt}` forces a fresh element rather than
 * fighting the browser's handling of an unchanged `src`) rather than a blind fixed delay before
 * showing anything, since the lag is inconsistent per-asset.
 */
function VariantMedia({ item, variant = "main" }: { item: VariantItem; variant?: "main" | "thumb" }) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const src = attempt === 0 ? item.url : `${item.url}${item.url.includes("?") ? "&" : "?"}retry=${attempt}`;
  const isThumb = variant === "thumb";

  function handleError() {
    if (attempt < MEDIA_MAX_RETRIES) {
      setTimeout(() => setAttempt((a) => a + 1), MEDIA_RETRY_DELAY_MS);
    } else {
      setFailed(true);
    }
  }

  // `object-contain` (not `cover`) so nothing gets cropped when the cell's aspect ratio
  // doesn't match the media's own — true for both the large main viewer and the tiny thumbs.
  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-lg bg-white/5">
      {failed ? (
        <p className={isThumb ? "px-1 text-center text-[9px] text-red-300" : "px-2 text-center text-xs text-red-300"}>
          {isThumb ? "✕" : `Couldn't load ${item.label}`}
        </p>
      ) : item.kind === "video" ? (
        <video
          key={attempt}
          src={src}
          controls={!isThumb}
          autoPlay
          muted
          loop
          playsInline
          onError={handleError}
          className="h-full max-h-full w-full max-w-full object-contain shadow-2xl"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- external Cloudinary-hosted URL, not a static asset
        <img
          key={attempt}
          src={src}
          alt={item.label}
          onError={handleError}
          className="h-full max-h-full w-full max-w-full object-contain shadow-2xl"
        />
      )}
    </div>
  );
}

/** Deterministic — same pure builders the server uses, so this always matches what's cached. */
function buildAllVariantUrls(publicId: string): VariantItem[] {
  return [
    ...BACKGROUND_PRESETS.map((preset) => ({
      kind: "background" as const,
      id: preset.id,
      label: preset.label,
      url: buildCloudinaryDeliveryUrl(CLOUD_NAME, publicId, buildGenBackgroundReplaceTransformation(preset.id)),
    })),
    ...RECOLOR_PALETTE.map((swatch) => ({
      kind: "recolor" as const,
      id: swatch.id,
      label: swatch.label,
      url: buildCloudinaryDeliveryUrl(CLOUD_NAME, publicId, buildGenRecolorTransformation(swatch.id)),
    })),
    {
      kind: "video" as const,
      id: VIDEO_PRESET.id,
      label: VIDEO_PRESET.label,
      url: buildCloudinaryDeliveryUrl(CLOUD_NAME, publicId, buildVideoTransformation()),
    },
  ];
}

/**
 * Generate/view backgrounds, colors & video for one garment. Results live behind a full-screen
 * gallery modal, not inline in the card — clicking "Generate" opens it immediately (showing a
 * loading state while the real generation call runs); closing it collapses back to a compact,
 * differently-colored "View ..." button rather than re-showing the images inline, so the card
 * grid stays scannable. Reopening never re-fetches — it's already generated, so the result URLs
 * are just rebuilt from the same pure transform functions the server used.
 */
export default function VariantsGallery({ publicId, initialGenerated }: { publicId: string; initialGenerated: boolean }) {
  const [generated, setGenerated] = useState(initialGenerated);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<VariantItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = items[selectedIndex] ?? null;

  const closeGallery = useCallback(() => setGalleryOpen(false), []);
  const goPrev = useCallback(() => {
    setSelectedIndex((i) => (items.length === 0 ? i : (i - 1 + items.length) % items.length));
  }, [items.length]);
  const goNext = useCallback(() => {
    setSelectedIndex((i) => (items.length === 0 ? i : (i + 1) % items.length));
  }, [items.length]);

  useEffect(() => {
    if (!galleryOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeGallery();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [galleryOpen, closeGallery, goPrev, goNext]);

  async function runGenerate() {
    setError(null);
    setPending(true);
    setGalleryOpen(true);
    try {
      const res = await fetch(`/api/pipeline/${encodeURIComponent(publicId)}/variants`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }
      const result = await res.json();
      const failed = (result.variants ?? []).filter((v: { status: string }) => v.status !== "done");
      if (failed.length > 0) {
        throw new Error(`${failed.length} variant(s) failed — try again.`);
      }
      setItems(buildAllVariantUrls(publicId));
      setSelectedIndex(0);
      setGenerated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }

  function openExisting() {
    setItems(buildAllVariantUrls(publicId));
    setSelectedIndex(0);
    setGalleryOpen(true);
  }

  return (
    <>
      {generated ? (
        <button
          type="button"
          onClick={openExisting}
          className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-700"
        >
          View backgrounds, colors & video
        </button>
      ) : (
        <button
          type="button"
          onClick={runGenerate}
          disabled={pending}
          className="rounded bg-foreground px-3 py-1.5 text-xs font-medium text-background transition disabled:opacity-50"
        >
          {pending ? "Generating…" : "Generate backgrounds, colors & video"}
        </button>
      )}

      {galleryOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]"
          onClick={closeGallery}
          role="dialog"
          aria-modal="true"
          aria-label="Generated backgrounds, colors & video"
        >
          <div className="flex items-center justify-between px-5 py-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="truncate font-mono text-xs text-white/70">{publicId}</h2>
            <button
              type="button"
              onClick={closeGallery}
              className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white transition hover:bg-white/20"
            >
              Close ✕
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden px-5 pb-4" onClick={(e) => e.stopPropagation()}>
            {pending && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-white/80">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/25 border-t-white" />
                <p className="text-sm">Generating backgrounds, colors &amp; video…</p>
              </div>
            )}

            {!pending && error && (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <p className="max-w-sm text-sm text-red-300">{error}</p>
                <button type="button" onClick={runGenerate} className="rounded bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/20">
                  Try again
                </button>
              </div>
            )}

            {!pending && !error && items.length > 0 && selected && (
              <div className="mx-auto flex h-full w-full max-w-4xl flex-col gap-3">
                <div className="relative min-h-0 flex-1">
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={goPrev}
                      aria-label="Previous"
                      className="absolute left-1 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-lg text-white transition hover:bg-white/20"
                    >
                      ‹
                    </button>
                  )}
                  <VariantMedia key={selected.id} item={selected} />
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={goNext}
                      aria-label="Next"
                      className="absolute right-1 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-lg text-white transition hover:bg-white/20"
                    >
                      ›
                    </button>
                  )}
                </div>

                <p className="shrink-0 text-center text-xs text-white/70">{selected.label}</p>

                <div className="flex shrink-0 justify-center gap-2 overflow-x-auto pb-1">
                  {items.map((item, i) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedIndex(i)}
                      aria-label={item.label}
                      aria-current={i === selectedIndex}
                      className={`h-14 w-14 shrink-0 overflow-hidden rounded border-2 transition sm:h-16 sm:w-16 ${
                        i === selectedIndex ? "border-white" : "border-transparent opacity-50 hover:opacity-80"
                      }`}
                    >
                      <VariantMedia item={item} variant="thumb" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
