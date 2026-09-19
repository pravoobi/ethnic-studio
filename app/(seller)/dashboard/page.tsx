import { prisma } from "@/lib/db";
import { getCloudinaryClient } from "@/lib/cloudinary/client";
import { readStructuredMetadata } from "@/lib/cloudinary/metadata";
import { buildCutoutTransformation, buildDeliveryTransformation, buildExportTransformation } from "@/lib/cloudinary/transforms";
import { EXPORT_PRESETS } from "@/lib/presets";
import ImagePreviewProvider from "./ImagePreviewModal";
import { PreviewLink, PreviewThumbnail } from "./PreviewTrigger";
import VariantsGallery from "./VariantsGallery";

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

      return { ...garment, metadata, originalUrl, cutoutUrl, exportUrls };
    })
  );
}

export default async function DashboardPage() {
  const garments = await loadGarments();

  return (
    <ImagePreviewProvider>
      <main className="flex flex-1 flex-col gap-6 bg-zinc-50 p-8 animate-[fadeInUp_400ms_ease-out] dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>

        {garments.length === 0 && (
          <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
            No garments yet —{" "}
            <a href="/upload" className="underline underline-offset-2 transition-colors hover:text-indigo-600">
              upload one
            </a>
            .
          </p>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {garments.map((garment) => (
            <div
              key={garment.id}
              className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
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

              <VariantsGallery publicId={garment.publicId} initialGenerated={Boolean(garment.variantsGeneratedAt)} />
            </div>
          ))}
        </div>
      </main>
    </ImagePreviewProvider>
  );
}
