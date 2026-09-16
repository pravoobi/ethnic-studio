// Setup + spike phase (CLAUDE.md, Sep 17-18): hand-test every Cloudinary AI feature the
// pipeline depends on against 3 real garment photos, and note credit cost per feature.
//
// Run with: pnpm spike
// Requires .env.local (CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET) and 3+ real garment photos
// dropped into fixtures/spike-photos/ (see that folder's README).
//
// This is a standalone diagnostic script, not part of the app runtime — it configures its
// own Cloudinary client directly rather than importing lib/cloudinary/client.ts, whose
// "server-only" guard throws when imported outside a Next.js server-component bundle.

import { readdirSync, writeFileSync } from "node:fs";
import { extname, join, parse } from "node:path";
import { config as loadEnv } from "dotenv";
import { v2 as cloudinary } from "cloudinary";

import {
  BACKGROUND_PRESETS,
  EXPORT_PRESETS,
  RECOLOR_PALETTE,
} from "../lib/presets";
import {
  buildExportTransformation,
  buildGenBackgroundReplaceTransformation,
  buildGenRecolorTransformation,
} from "../lib/cloudinary/transforms";

loadEnv({ path: ".env.local" });

const PHOTOS_DIR = "fixtures/spike-photos";
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

interface StepResult {
  photo: string;
  step: string;
  ok: boolean;
  detail?: unknown;
  error?: string;
}

const results: StepResult[] = [];

function record(result: StepResult) {
  results.push(result);
  const status = result.ok ? "OK  " : "FAIL";
  console.log(`  [${status}] ${result.step}${result.error ? ` — ${result.error}` : ""}`);
}

/** HEAD-check a delivery URL without spending a full download. */
async function checkUrl(url: string): Promise<{ ok: boolean; status: number }> {
  const res = await fetch(url, { method: "HEAD" });
  return { ok: res.ok, status: res.status };
}

async function main() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.error(
      "Missing Cloudinary credentials. Copy .env.example to .env.local and fill in " +
        "CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET."
    );
    process.exit(1);
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });

  let photos: string[];
  try {
    photos = readdirSync(PHOTOS_DIR).filter((f) => IMAGE_EXTENSIONS.has(extname(f).toLowerCase()));
  } catch {
    console.error(`Could not read ${PHOTOS_DIR}. See fixtures/spike-photos/README.md.`);
    process.exit(1);
  }

  if (photos.length === 0) {
    console.error(`No photos found in ${PHOTOS_DIR}. Drop 3 real garment photos there first.`);
    process.exit(1);
  }

  console.log(`Found ${photos.length} photo(s): ${photos.join(", ")}\n`);

  console.log("Account usage before spike test:");
  const usageBefore = await cloudinary.api.usage().catch((err) => {
    console.log(`  could not fetch usage: ${err.message}`);
    return null;
  });
  if (usageBefore) console.log(JSON.stringify(usageBefore.credits ?? usageBefore, null, 2));

  for (const photo of photos) {
    const filePath = join(PHOTOS_DIR, photo);
    const publicId = `spike/${parse(photo).name}`;
    console.log(`\n=== ${photo} ===`);

    // 1-3. Upload + auto-tagging add-on + background-removal (cutout) add-on, in one call.
    // NOTE: `categorization` value depends on which auto-tagging add-on is actually enabled
    // on this account (check Console > Add-ons) — swap "google_tagging" if a different one
    // (e.g. "aws_rek_tagging", "imagga_tagging") is what's active.
    let uploadResult: Awaited<ReturnType<typeof cloudinary.uploader.upload>> | undefined;
    try {
      uploadResult = await cloudinary.uploader.upload(filePath, {
        public_id: publicId,
        overwrite: true,
        categorization: "google_tagging",
        auto_tagging: 0.6,
        eager: [{ effect: "background_removal" }],
      });
      record({
        photo,
        step: "upload",
        ok: true,
        detail: { publicId: uploadResult.public_id, url: uploadResult.secure_url },
      });
      record({
        photo,
        step: "auto-tagging add-on (categorization: google_tagging)",
        ok: Boolean(uploadResult.tags?.length),
        detail: uploadResult.tags,
        error: uploadResult.tags?.length ? undefined : "no tags returned — add-on may not be enabled",
      });
      const cutout = uploadResult.eager?.[0];
      record({
        photo,
        step: "background_removal add-on",
        ok: Boolean(cutout?.secure_url),
        detail: cutout?.secure_url,
        error: cutout?.secure_url ? undefined : "no eager cutout returned — add-on may not be enabled",
      });
    } catch (err) {
      record({ photo, step: "upload", ok: false, error: (err as Error).message });
      continue; // remaining checks need a successful upload
    }

    // 4. Smart crop for each export preset (c_fill,g_auto — no add-on required).
    for (const preset of EXPORT_PRESETS) {
      const url = cloudinary.url(publicId, { raw_transformation: buildExportTransformation(preset.id) });
      const { ok, status } = await checkUrl(url).catch((err) => ({ ok: false, status: -1, error: err.message }));
      record({ photo, step: `export crop: ${preset.id}`, ok, detail: { url, status } });
    }

    // 5. Generative background replace for each preset prompt.
    for (const preset of BACKGROUND_PRESETS) {
      const url = cloudinary.url(publicId, {
        raw_transformation: buildGenBackgroundReplaceTransformation(preset.id),
      });
      const { ok, status } = await checkUrl(url).catch((err) => ({ ok: false, status: -1, error: err.message }));
      record({ photo, step: `gen_background_replace: ${preset.id}`, ok, detail: { url, status } });
    }

    // 6. Generative recolor for each palette swatch.
    for (const swatch of RECOLOR_PALETTE) {
      const url = cloudinary.url(publicId, { raw_transformation: buildGenRecolorTransformation(swatch.id) });
      const { ok, status } = await checkUrl(url).catch((err) => ({ ok: false, status: -1, error: err.message }));
      record({ photo, step: `gen_recolor: ${swatch.id}`, ok, detail: { url, status } });
    }
  }

  console.log("\nAccount usage after spike test:");
  const usageAfter = await cloudinary.api.usage().catch((err) => {
    console.log(`  could not fetch usage: ${err.message}`);
    return null;
  });
  if (usageAfter) console.log(JSON.stringify(usageAfter.credits ?? usageAfter, null, 2));

  const outFile = "docs/spike-results.json";
  writeFileSync(outFile, JSON.stringify({ usageBefore, usageAfter, results }, null, 2));
  console.log(`\nFull results written to ${outFile} (gitignored — summarize findings into docs/decisions.md by hand).`);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length) {
    console.log("Failed checks (likely: add-on not enabled/free-tier limit, or 4xx from an unverified transformation string):");
    for (const f of failed) console.log(`  - [${f.photo}] ${f.step}: ${f.error ?? JSON.stringify(f.detail)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
