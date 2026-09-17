import { prisma } from "@/lib/db";
import { getCloudinaryClient } from "@/lib/cloudinary/client";
import { readStructuredMetadata } from "@/lib/cloudinary/metadata";
import {
  buildCutoutTransformation,
  buildDeliveryTransformation,
  buildExportTransformation,
  buildGenBackgroundReplaceTransformation,
  buildGenRecolorTransformation,
  buildVideoTransformation,
} from "@/lib/cloudinary/transforms";
import { BACKGROUND_PRESETS, EXPORT_PRESETS, RECOLOR_PALETTE, VIDEO_PRESET } from "@/lib/presets";
import GenerateVariantsButton from "./GenerateVariantsButton";
import ImagePreviewProvider from "./ImagePreviewModal";
import { PreviewLink, PreviewThumbnail } from "./PreviewTrigger";

export const dynamic = "force-dynamic";

async function loadGarments() {
  const garments = await prisma.garment.findMany({ orderBy: { createdAt: "desc" } });
  const cloudinary = getCloudinaryClient();

  return Promise.all(
    garments.map(async (garment) => {
      const metadata = await readStructuredMetadata(garment.publicId).catch(() => null);
      const originalUrl = cloudinary.url(garment.publicId, { raw_transformation: buildDeliveryTransformation() });
      const cutoutUrl = cloudinary.url(garment.publicId, { raw_transformation: buildCutoutTransformation() });
      const exportUrls = EXPORT_PRESETS.map((preset) => ({
        id: preset.id,
        label: preset.label,
        url: cloudinary.url(garment.publicId, { raw_transformation: buildExportTransformation(preset.id) }),
      }));

      // Only construct these once variantsGeneratedAt is set — otherwise requesting them would
      // trigger render-time generation for the one thing CLAUDE.md most wants generated once.
      const backgroundUrls = garment.variantsGeneratedAt
        ? BACKGROUND_PRESETS.map((preset) => ({
            id: preset.id,
            label: preset.label,
            url: cloudinary.url(garment.publicId, {
              raw_transformation: buildGenBackgroundReplaceTransformation(preset.id),
            }),
          }))
        : [];
      const recolorUrls = garment.variantsGeneratedAt
        ? RECOLOR_PALETTE.map((swatch) => ({
            id: swatch.id,
            label: swatch.label,
            url: cloudinary.url(garment.publicId, { raw_transformation: buildGenRecolorTransformation(swatch.id) }),
          }))
        : [];
      const videoUrl = garment.variantsGeneratedAt
        ? cloudinary.url(garment.publicId, { raw_transformation: buildVideoTransformation() })
        : null;

      return { ...garment, metadata, originalUrl, cutoutUrl, exportUrls, backgroundUrls, recolorUrls, videoUrl };
    })
  );
}

export default async function DashboardPage() {
  const garments = await loadGarments();

  return (
    <ImagePreviewProvider>
      <main className="flex flex-1 flex-col gap-6 bg-zinc-50 p-8 dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>

        {garments.length === 0 && (
          <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
            No garments yet — <a href="/upload" className="underline underline-offset-2">upload one</a>.
          </p>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {garments.map((garment) => (
            <div
              key={garment.id}
              className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-mono text-xs text-zinc-500">{garment.publicId}</span>
                <span
                  className={
                    garment.status === "ready"
                      ? "shrink-0 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200"
                      : "shrink-0 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900 dark:text-red-200"
                  }
                >
                  {garment.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <PreviewThumbnail src={garment.originalUrl} alt="Original" className="aspect-square w-full" />
                <PreviewThumbnail src={garment.cutoutUrl} alt="Cutout" className="aspect-square w-full" />
              </div>

              <dl className="text-sm">
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Category</dt>
                  <dd className="font-medium">{garment.metadata?.category ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Color</dt>
                  <dd className="font-medium">{garment.metadata?.color ?? "—"}</dd>
                </div>
              </dl>

              <div className="flex flex-wrap gap-1.5 text-xs">
                {garment.exportUrls.map((exportUrl) => (
                  <PreviewLink
                    key={exportUrl.id}
                    href={exportUrl.url}
                    label={exportUrl.label}
                    className="rounded-full border border-zinc-200 px-2.5 py-1 font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  />
                ))}
                <a
                  href={`/api/export/${encodeURIComponent(garment.publicId)}`}
                  className="rounded-full border border-zinc-200 px-2.5 py-1 font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Download zip
                </a>
              </div>

              {garment.variantsGeneratedAt ? (
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-3 gap-2">
                    {garment.backgroundUrls.map((bg) => (
                      <PreviewThumbnail key={bg.id} src={bg.url} alt={bg.label} className="aspect-square w-full" />
                    ))}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {garment.recolorUrls.map((recolor) => (
                      <PreviewThumbnail key={recolor.id} src={recolor.url} alt={recolor.label} className="aspect-square w-full" />
                    ))}
                  </div>
                  {garment.videoUrl && (
                    <div className="flex flex-col gap-1.5">
                      <video
                        src={garment.videoUrl}
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="w-full rounded-lg"
                        style={{ aspectRatio: `${VIDEO_PRESET.width} / ${VIDEO_PRESET.height}` }}
                      />
                      <PreviewLink
                        href={garment.videoUrl}
                        label={VIDEO_PRESET.label}
                        isVideo
                        className="self-start text-xs font-medium text-zinc-600 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <GenerateVariantsButton publicId={garment.publicId} />
              )}
            </div>
          ))}
        </div>
      </main>
    </ImagePreviewProvider>
  );
}
