// Search API wrapper (CLAUDE.md §"Search" — buyer catalog queries by metadata fields).
// Expression syntax confirmed live against the real account 2026-09-17 (docs/decisions.md).

import "server-only";
import { getCloudinaryClient } from "./client";
import type { GarmentMetadata } from "./metadata";
import type { GarmentCategory } from "../presets";

const GARMENTS_FOLDER = "ethnic-studio/garments";

export interface CatalogSearchFilters {
  category?: GarmentCategory;
}

export interface CatalogSearchResult {
  publicId: string;
  metadata: Partial<GarmentMetadata>;
}

function escapeExpressionValue(value: string): string {
  return value.replace(/"/g, '\\"');
}

/** Only ever returns `status="ready"` garments — buyers shouldn't see processing/failed ones. */
export async function searchCatalog(filters: CatalogSearchFilters = {}): Promise<CatalogSearchResult[]> {
  const cloudinary = getCloudinaryClient();

  const clauses = [`folder="${GARMENTS_FOLDER}"`, `metadata.status="ready"`];
  if (filters.category) {
    clauses.push(`metadata.category="${escapeExpressionValue(filters.category)}"`);
  }

  const result = await cloudinary.search
    .expression(clauses.join(" AND "))
    .with_field("metadata")
    .max_results(100)
    .execute();

  const resources: Array<{ public_id: string; metadata?: Partial<GarmentMetadata> }> = result?.resources ?? [];
  return resources.map((resource) => ({
    publicId: resource.public_id,
    metadata: resource.metadata ?? {},
  }));
}
