// Structured metadata read/write (CLAUDE.md §"Tag + metadata"). Field definitions
// (category/color/fabric/occasion/status) must exist on the account first — see
// scripts/setup-metadata-fields.ts. No auto-tagging add-on is available (docs/decisions.md),
// so `category` is seller-selected and `color` comes from free dominant-color analysis.

import "server-only";
import { getCloudinaryClient } from "./client";
import { buildCutoutTransformation } from "./transforms";
import { nameColorFromHex } from "../colorNaming";
import type { GarmentCategory } from "../presets";

export interface GarmentMetadata {
  category: GarmentCategory;
  color: string;
  fabric: string;
  occasion: string;
  status: "processing" | "ready" | "failed";
}

/**
 * Cloudinary's structured-metadata write format: pipe-separated `external_id=value` pairs.
 * Cloudinary stores exactly the string sent here — it does not URL-decode it back out on read.
 * Confirmed live 2026-09-18: the original implementation encoded values with
 * `encodeURIComponent`, which left a literal "%20" in stored color names like "Forest Green"
 * once the color namer (lib/colorNaming.ts) started producing multi-word names. None of our
 * generated values (category/status enums, the color namer's output, fabric/occasion) ever
 * legitimately contain the reserved `|`/`=` delimiters, so values are written as-is; guard
 * against it anyway rather than silently corrupt the record if that ever changes.
 */
function serializeMetadata(metadata: Partial<GarmentMetadata>): string {
  return Object.entries(metadata)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => {
      const raw = String(value);
      if (raw.includes("|") || raw.includes("=")) {
        throw new Error(`serializeMetadata: value for "${key}" contains a reserved delimiter ("|" or "="): ${raw}`);
      }
      return `${key}=${raw}`;
    })
    .join("|");
}

export async function writeStructuredMetadata(publicId: string, metadata: Partial<GarmentMetadata>): Promise<void> {
  const cloudinary = getCloudinaryClient();
  await cloudinary.uploader.explicit(publicId, {
    type: "upload",
    metadata: serializeMetadata(metadata),
  });
}

export async function readStructuredMetadata(publicId: string): Promise<Partial<GarmentMetadata> | null> {
  const cloudinary = getCloudinaryClient();
  const resource = await cloudinary.api.resource(publicId, { metadata: true });
  return (resource?.metadata as Partial<GarmentMetadata> | undefined) ?? null;
}

/**
 * Free, non-add-on dominant-color detection — the fallback for the `color` metadata field since
 * the paid auto-tagging add-on isn't subscribed (docs/decisions.md).
 *
 * Runs `colors: true` against the *cutout*, not the original photo. Confirmed live 2026-09-18:
 * running it on the original swamps the result with backdrop color — every one of 14 real
 * seller photos on a plain studio backdrop came back "White"/"Gray", the exact opposite of what
 * a clean product photo should produce. Cloudinary's Admin API has no "colors of this specific
 * transformation" endpoint, so getting colors of the cutout means the cutout has to actually
 * exist as its own asset: re-upload the cutout delivery URL under `<publicId>-cutout-color-src`
 * (deterministic + `overwrite: true`, so repeated pipeline runs don't accumulate duplicates).
 *
 * Names the result with `nameColorFromHex` (`lib/colorNaming.ts`) rather than trusting
 * Cloudinary's own `predominant` bucket names — those are too coarse for pastels, confirmed live
 * on real seller photos (a pale cyan-gray came back "white", a pale sage came back "lime"; see
 * docs/decisions.md). `colors` is already sorted by percentage descending, so `colors[0]` is the
 * single largest hex cluster in the (transparency-excluded) cutout.
 */
export async function fetchDominantColor(publicId: string): Promise<string> {
  const cloudinary = getCloudinaryClient();
  const cutoutUrl = cloudinary.url(publicId, { raw_transformation: buildCutoutTransformation() });
  const result = await cloudinary.uploader.upload(cutoutUrl, {
    public_id: `${publicId}-cutout-color-src`,
    overwrite: true,
    colors: true,
  });
  const colors: [string, number][] = result?.colors ?? [];
  const [topHex] = colors[0] ?? [];
  return topHex ? nameColorFromHex(topHex) : "unknown";
}
