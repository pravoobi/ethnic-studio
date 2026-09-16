// Structured metadata read/write (CLAUDE.md §"Tag + metadata"). Signatures only for now —
// real implementations land in the Sep 19-22 core pipeline phase, once auto-tagging add-on
// activation and free-tier quota have been confirmed (see docs/decisions.md).

export interface GarmentMetadata {
  category: string;
  color: string;
  fabric: string;
  occasion: string;
  status: "processing" | "ready" | "failed";
}

export function mapAutoTagsToMetadata(_tags: string[]): Partial<GarmentMetadata> {
  throw new Error(
    "mapAutoTagsToMetadata is not implemented yet — pending Cloudinary auto-tagging add-on verification (Sep 19-22)."
  );
}

export async function writeStructuredMetadata(_publicId: string, _metadata: Partial<GarmentMetadata>): Promise<void> {
  throw new Error("writeStructuredMetadata is not implemented yet (Sep 19-22 core pipeline phase).");
}

export async function readStructuredMetadata(_publicId: string): Promise<GarmentMetadata | null> {
  throw new Error("readStructuredMetadata is not implemented yet (Sep 19-22 core pipeline phase).");
}
