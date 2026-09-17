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
    <main className="flex flex-1 flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {garments.length === 0 && (
        <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
          No garments yet — <a href="/upload" className="underline underline-offset-2">upload one</a>.
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {garments.map((garment) => (
          <div key={garment.id} className="flex flex-col gap-3 rounded border border-zinc-300 p-4 dark:border-zinc-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-500">{garment.publicId}</span>
              <span
                className={
                  garment.status === "ready"
                    ? "rounded bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900 dark:text-green-200"
                    : "rounded bg-red-100 px-2 py-0.5 text-xs text-red-800 dark:bg-red-900 dark:text-red-200"
                }
              >
                {garment.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- external Cloudinary-hosted URL, not a static asset */}
              <img src={garment.originalUrl} alt="Original" className="aspect-square w-full rounded object-cover" />
              {/* eslint-disable-next-line @next/next/no-img-element -- external Cloudinary-hosted URL, not a static asset */}
              <img src={garment.cutoutUrl} alt="Cutout" className="aspect-square w-full rounded object-cover" />
            </div>

            <dl className="text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-500">Category</dt>
                <dd>{garment.metadata?.category ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Color</dt>
                <dd>{garment.metadata?.color ?? "—"}</dd>
              </div>
            </dl>

            <div className="flex flex-wrap gap-2 text-xs">
              {garment.exportUrls.map((exportUrl) => (
                <a key={exportUrl.id} href={exportUrl.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                  {exportUrl.label}
                </a>
              ))}
              <a href={`/api/export/${encodeURIComponent(garment.publicId)}`} className="underline underline-offset-2">
                Download zip
              </a>
            </div>

            {garment.variantsGeneratedAt ? (
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-3 gap-2">
                  {garment.backgroundUrls.map((bg) => (
                    // eslint-disable-next-line @next/next/no-img-element -- external Cloudinary-hosted URL, not a static asset
                    <img key={bg.id} src={bg.url} alt={bg.label} title={bg.label} className="aspect-square w-full rounded object-cover" />
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {garment.recolorUrls.map((recolor) => (
                    // eslint-disable-next-line @next/next/no-img-element -- external Cloudinary-hosted URL, not a static asset
                    <img
                      key={recolor.id}
                      src={recolor.url}
                      alt={recolor.label}
                      title={recolor.label}
                      className="aspect-square w-full rounded object-cover"
                    />
                  ))}
                </div>
                {garment.videoUrl && (
                  <div className="flex flex-col gap-1">
                    <video
                      src={garment.videoUrl}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="w-full rounded"
                      style={{ aspectRatio: `${VIDEO_PRESET.width} / ${VIDEO_PRESET.height}` }}
                    />
                    <a href={garment.videoUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline underline-offset-2">
                      {VIDEO_PRESET.label}
                    </a>
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
  );
}
