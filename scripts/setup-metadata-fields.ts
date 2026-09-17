// One-time (idempotent) setup: creates the Cloudinary structured metadata field definitions
// that lib/cloudinary/metadata.ts writes to. Must be run once against the account before the
// pipeline can write category/color/fabric/occasion/status metadata (CLAUDE.md §"Tag + metadata").
//
// Run with: pnpm setup:metadata

import { config as loadEnv } from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import { GARMENT_CATEGORIES } from "../lib/presets";

loadEnv({ path: ".env.local" });

interface MetadataFieldDefinition {
  external_id: string;
  label: string;
  type: "string" | "enum";
  mandatory?: boolean;
  datasource?: { values: Array<{ value: string; external_id: string }> };
}

const FIELDS: MetadataFieldDefinition[] = [
  {
    external_id: "category",
    label: "Category",
    type: "enum",
    datasource: { values: GARMENT_CATEGORIES.map((c) => ({ value: c, external_id: c })) },
  },
  { external_id: "color", label: "Color", type: "string" },
  { external_id: "fabric", label: "Fabric", type: "string" },
  { external_id: "occasion", label: "Occasion", type: "string" },
  {
    external_id: "status",
    label: "Status",
    type: "enum",
    datasource: {
      values: ["processing", "ready", "failed"].map((v) => ({ value: v, external_id: v })),
    },
  },
];

async function main() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.error("Missing Cloudinary credentials. Fill in .env.local first.");
    process.exit(1);
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });

  const existing = await cloudinary.api.list_metadata_fields();
  const existingIds = new Set((existing.metadata_fields ?? []).map((f: { external_id: string }) => f.external_id));

  for (const field of FIELDS) {
    if (existingIds.has(field.external_id)) {
      console.log(`[skip] ${field.external_id} already exists`);
      continue;
    }
    try {
      await cloudinary.api.add_metadata_field(field);
      console.log(`[created] ${field.external_id}`);
    } catch (err) {
      console.error(`[FAIL] ${field.external_id}:`, (err as Error).message);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
