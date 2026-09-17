import { prisma } from "@/lib/db";
import { getCloudinaryClient } from "@/lib/cloudinary/client";
import { readStructuredMetadata } from "@/lib/cloudinary/metadata";
import { buildCutoutTransformation, buildDeliveryTransformation, buildExportTransformation } from "@/lib/cloudinary/transforms";
import { EXPORT_PRESETS } from "@/lib/presets";

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
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
