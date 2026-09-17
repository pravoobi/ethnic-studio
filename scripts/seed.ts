// Seeds demo garments (CLAUDE.md Sep 28-29: "10-15 seeded garments"). Uploads each real photo
// in fixtures/seed-photos/ to Cloudinary directly, then POSTs to the real /api/pipeline/[id]
// route so seeding runs through the actual pipeline code (cutout/crop/tag/metadata) rather than
// a duplicated copy of it — same reasoning as scripts/spike-test.ts for not importing
// lib/cloudinary/client.ts here ("server-only" throws outside a Next.js server bundle).
//
// Run with: pnpm seed
// Requires: the app running (pnpm dev, or set SEED_BASE_URL to a deployed URL), a real
// DATABASE_URL/Cloudinary credentials in .env.local, and photos in fixtures/seed-photos/ named
// "<category>-anything.ext" (see that folder's README).

import { readdirSync } from "node:fs";
import { extname, join } from "node:path";
import { config as loadEnv } from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import { GARMENT_CATEGORIES } from "../lib/presets";

loadEnv({ path: ".env.local" });

const PHOTOS_DIR = "fixtures/seed-photos";
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const BASE_URL = process.env.SEED_BASE_URL ?? "http://localhost:3000";

function categoryFromFilename(filename: string): string | null {
  const [prefix] = filename.split(/[-_]/, 1);
  const candidate = prefix.toLowerCase();
  return (GARMENT_CATEGORIES as readonly string[]).includes(candidate) ? candidate : null;
}

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

  let files: string[];
  try {
    files = readdirSync(PHOTOS_DIR).filter((f) => IMAGE_EXTENSIONS.has(extname(f).toLowerCase()));
  } catch {
    console.error(`Could not read ${PHOTOS_DIR}. See fixtures/seed-photos/README.md.`);
    process.exit(1);
  }

  if (files.length === 0) {
    console.error(`No photos found in ${PHOTOS_DIR}. Drop real garment photos there first.`);
    process.exit(1);
  }

  console.log(`Found ${files.length} photo(s). Seeding against ${BASE_URL}...\n`);

  let ok = 0;
  let failed = 0;

  for (const file of files) {
    const category = categoryFromFilename(file);
    if (!category) {
      console.log(`[skip] ${file} — filename must start with one of: ${GARMENT_CATEGORIES.join(", ")}`);
      failed++;
      continue;
    }

    try {
      const uploadResult = await cloudinary.uploader.upload(join(PHOTOS_DIR, file), {
        folder: "ethnic-studio/garments",
      });

      const pipelineRes = await fetch(`${BASE_URL}/api/pipeline/${encodeURIComponent(uploadResult.public_id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });

      if (!pipelineRes.ok) {
        const body = await pipelineRes.json().catch(() => null);
        throw new Error(body?.error ?? `pipeline request failed (${pipelineRes.status})`);
      }

      const result = await pipelineRes.json();
      const stepsOk = result.steps?.every((s: { status: string }) => s.status === "done");
      console.log(`[${stepsOk ? "OK" : "PARTIAL"}] ${file} -> ${uploadResult.public_id} (${category})`);
      ok++;
    } catch (err) {
      console.log(`[FAIL] ${file}: ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(`\n${ok} seeded, ${failed} failed/skipped.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
