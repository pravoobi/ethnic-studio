// Search API wrapper (CLAUDE.md §"Search" — buyer catalog queries by metadata fields).
// Signature only for now; real implementation lands in the Sep 26-27 buyer-side phase.

import type { GarmentMetadata } from "@/lib/cloudinary/metadata";

export interface CatalogSearchFilters {
  category?: string;
  color?: string;
  fabric?: string;
  occasion?: string;
}

export interface CatalogSearchResult {
  publicId: string;
  url: string;
  metadata: GarmentMetadata;
}

export async function searchCatalog(_filters: CatalogSearchFilters): Promise<CatalogSearchResult[]> {
  throw new Error("searchCatalog is not implemented yet (Sep 26-27 buyer catalog phase).");
}
