import { getCloudinaryClient } from "@/lib/cloudinary/client";
import { buildCutoutTransformation } from "@/lib/cloudinary/transforms";
import { searchCatalog } from "@/lib/cloudinary/search";
import { GARMENT_CATEGORIES, type GarmentCategory } from "@/lib/presets";
import CatalogFilters from "./CatalogFilters";

export const dynamic = "force-dynamic";

const TRYON_URL = process.env.NEXT_PUBLIC_TRYON_URL ?? "https://pravoobi.github.io/try-on";

function isGarmentCategory(value: string): value is GarmentCategory {
  return (GARMENT_CATEGORIES as readonly string[]).includes(value);
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; color?: string }>;
}) {
  const { category: categoryParam, color: colorParam } = await searchParams;
  const category = categoryParam && isGarmentCategory(categoryParam) ? categoryParam : undefined;

  const results = await searchCatalog({ category });
  const colors = Array.from(new Set(results.map((r) => r.metadata.color).filter((c): c is string => Boolean(c)))).sort();

  const filtered = colorParam ? results.filter((r) => r.metadata.color === colorParam) : results;

  const cloudinary = getCloudinaryClient();

  return (
    <main className="flex flex-1 flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Catalog</h1>

      <CatalogFilters colors={colors} />

      {results.length === 0 ? (
        <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">No garments in the catalog yet.</p>
      ) : filtered.length === 0 ? (
        <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">No garments match these filters.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((garment) => {
            const cutoutUrl = cloudinary.url(garment.publicId, { raw_transformation: buildCutoutTransformation() });
            return (
              <div key={garment.publicId} className="flex flex-col gap-2 rounded border border-zinc-300 p-4 dark:border-zinc-700">
                {/* eslint-disable-next-line @next/next/no-img-element -- external Cloudinary-hosted URL, not a static asset */}
                <img src={cutoutUrl} alt={garment.metadata.category ?? "Garment"} className="aspect-square w-full rounded object-cover" />
                <dl className="text-sm">
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Category</dt>
                    <dd>{garment.metadata.category ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Color</dt>
                    <dd>{garment.metadata.color ?? "—"}</dd>
                  </div>
                </dl>
                <a href={TRYON_URL} target="_blank" rel="noopener noreferrer" className="text-sm font-medium underline underline-offset-2">
                  Try it on →
                </a>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
