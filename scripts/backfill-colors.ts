// One-off maintenance: re-runs the pipeline for every existing "ready" garment so `color` gets
// recomputed with the fixed fetchDominantColor (2026-09-18 — see docs/decisions.md for why the
// original logic returned "White"/"Gray" for nearly every real photo). Cutout/crop are cache
// hits (same transformation signature, already generated) — this only actually redoes the
// dominant-color analysis and the metadata write.
//
// Run with: pnpm backfill:colors
// Requires: the app running (pnpm dev, or SEED_BASE_URL pointed at a deployed URL).

import { config as loadEnv } from "dotenv";
import { v2 as cloudinary } from "cloudinary";

loadEnv({ path: ".env.local" });

const BASE_URL = process.env.SEED_BASE_URL ?? "http://localhost:3000";
const GARMENTS_FOLDER = "ethnic-studio/garments";

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

  const result = await cloudinary.search
    .expression(`folder="${GARMENTS_FOLDER}" AND metadata.status="ready"`)
    .with_field("metadata")
    .max_results(100)
    .execute();

  const resources: { public_id: string; metadata?: { category?: string; color?: string } }[] = result.resources ?? [];
  console.log(`Found ${resources.length} ready garment(s) against ${BASE_URL}.\n`);

  let ok = 0;
  let failed = 0;

  for (const resource of resources) {
    const category = resource.metadata?.category;
    if (!category) {
      console.log(`[skip] ${resource.public_id} — no category on record`);
      failed++;
      continue;
    }

    try {
      const res = await fetch(`${BASE_URL}/api/pipeline/${encodeURIComponent(resource.public_id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `pipeline request failed (${res.status})`);
      }
      const body = await res.json();
      const tagStep = body.steps?.find((s: { step: string }) => s.step === "tag");
      console.log(
        `[OK] ${resource.public_id}: color ${resource.metadata?.color ?? "?"} -> tag step ${tagStep?.status ?? "?"}`
      );
      ok++;
    } catch (err) {
      console.log(`[FAIL] ${resource.public_id}: ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(`\n${ok} re-processed, ${failed} failed/skipped.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
