"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

interface PreviewState {
  url: string;
  label: string;
  isVideo: boolean;
}

interface ModalContextValue {
  openPreview: (url: string, label: string, isVideo?: boolean) => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

/** Used by PreviewLink/PreviewThumbnail — must be rendered inside <ImagePreviewProvider>. */
export function useImagePreview(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error("useImagePreview must be used within an ImagePreviewProvider");
  }
  return ctx;
}

/**
 * One shared preview modal per page, opened by any PreviewLink/PreviewThumbnail underneath it.
 * Client component wrapping server-rendered children — the children (garment cards, built from
 * data already fetched server-side) pass straight through; only the trigger elements inside
 * them need to be client components to call openPreview.
 */
export default function ImagePreviewProvider({ children }: { children: React.ReactNode }) {
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [loaded, setLoaded] = useState(false);

  const openPreview = useCallback((url: string, label: string, isVideo = false) => {
    setLoaded(false);
    setPreview({ url, label, isVideo });
  }, []);

  const close = useCallback(() => setPreview(null), []);

  useEffect(() => {
    if (!preview) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [preview, close]);

  return (
    <ModalContext.Provider value={{ openPreview }}>
      {children}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={preview.label}
        >
          <div
            className="relative flex max-h-[90vh] max-w-[90vw] flex-col items-center animate-[scaleIn_180ms_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={close}
              aria-label="Close preview"
              className="absolute -top-11 right-0 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white transition hover:bg-white/20"
            >
              Close ✕
            </button>

            {!loaded && (
              <div className="flex h-72 w-72 items-center justify-center">
                <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/25 border-t-white" />
              </div>
            )}

            {preview.isVideo ? (
              <video
                src={preview.url}
                controls
                autoPlay
                onLoadedData={() => setLoaded(true)}
                className={`max-h-[80vh] rounded-xl shadow-2xl transition-opacity duration-200 ${loaded ? "opacity-100" : "absolute opacity-0"}`}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- external Cloudinary-hosted URL, not a static asset
              <img
                src={preview.url}
                alt={preview.label}
                onLoad={() => setLoaded(true)}
                className={`max-h-[80vh] rounded-xl shadow-2xl transition-opacity duration-200 ${loaded ? "opacity-100" : "absolute opacity-0"}`}
              />
            )}

            <p className="mt-3 text-sm font-medium text-white/90">{preview.label}</p>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}
