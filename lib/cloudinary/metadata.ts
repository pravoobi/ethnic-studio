// Structured metadata read/write (CLAUDE.md §"Tag + metadata"). Field definitions
// (category/color/fabric/occasion/status) must exist on the account first — see
// scripts/setup-metadata-fields.ts. No auto-tagging add-on is available (docs/decisions.md),
// so `category` is seller-selected and `color` comes from free dominant-color analysis.

import "server-only";
import { getCloudinaryClient } from "./client";
import type { GarmentCategory } from "../presets";

export interface GarmentMetadata {
  category: GarmentCategory;
  color: string;
  fabric: string;
  occasion: string;
  status: "processing" | "ready" | "failed";
}

/** Cloudinary's structured-metadata write format: pipe-separated `external_id=value` pairs. */
function serializeMetadata(metadata: Partial<GarmentMetadata>): string {
  return Object.entries(metadata)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
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

/** Picks the single most dominant named color from Cloudinary's free `colors: true` analysis. */
function pickDominantColorName(predominant: unknown): string {
  const source = predominant as { cloudinary?: [string, number][]; google?: [string, number][] } | undefined;
  const [topEntry] = source?.cloudinary ?? source?.google ?? [];
  const [name] = topEntry ?? [];
  if (!name) return "unknown";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Free, non-add-on dominant-color detection (confirmed live — docs/decisions.md) — the fallback
 * for the `color` metadata field since the paid auto-tagging add-on isn't subscribed.
 */
export async function fetchDominantColor(publicId: string): Promise<string> {
  const cloudinary = getCloudinaryClient();
  const resource = await cloudinary.api.resource(publicId, { colors: true });
  return pickDominantColorName(resource?.predominant);
}
