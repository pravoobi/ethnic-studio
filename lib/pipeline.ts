// Pipeline orchestration (CLAUDE.md §"Cloudinary pipeline (the product)").
// Runs post-upload: cutout + crop (one eager call), dominant-color lookup, structured-metadata
// write, then persists orchestration status. Every step is wrapped so one failure doesn't take
// out the rest — CLAUDE.md: "a failed generation must not break the rest of the listing."

import "server-only";
import { getCloudinaryClient } from "./cloudinary/client";
import { fetchDominantColor, writeStructuredMetadata } from "./cloudinary/metadata";
import {
  buildCutoutTransformation,
  buildExportTransformation,
  buildGenBackgroundReplaceTransformation,
  buildGenRecolorTransformation,
} from "./cloudinary/transforms";
import { prisma } from "./db";
import { BACKGROUND_PRESETS, EXPORT_PRESETS, RECOLOR_PALETTE, type GarmentCategory } from "./presets";

export type PipelineStepName = "cutout" | "crop" | "tag" | "metadata";
export type PipelineStepStatus = "done" | "failed";

export interface PipelineStepResult {
  step: PipelineStepName;
  status: PipelineStepStatus;
  error?: string;
}

export interface PipelineResult {
  garmentId: string;
  steps: PipelineStepResult[];
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function runPipeline(publicId: string, category: GarmentCategory): Promise<PipelineResult> {
  const cloudinary = getCloudinaryClient();
  const steps: PipelineStepResult[] = [];

  // Cutout + crop in one call — generated once here, cached by Cloudinary, never regenerated
  // on render (CLAUDE.md: "generate once in the pipeline, persist the derived URL").
  try {
    await cloudinary.uploader.explicit(publicId, {
      type: "upload",
      eager: [buildCutoutTransformation(), ...EXPORT_PRESETS.map((preset) => buildExportTransformation(preset.id))],
    });
    steps.push({ step: "cutout", status: "done" });
    steps.push({ step: "crop", status: "done" });
  } catch (err) {
    const error = errorMessage(err);
    console.error(`[pipeline:${publicId}] cutout/crop failed:`, error);
    steps.push({ step: "cutout", status: "failed", error });
    steps.push({ step: "crop", status: "failed", error });
  }

  let color = "unknown";
  try {
    color = await fetchDominantColor(publicId);
    steps.push({ step: "tag", status: "done" });
  } catch (err) {
    const error = errorMessage(err);
    console.error(`[pipeline:${publicId}] tag failed:`, error);
    steps.push({ step: "tag", status: "failed", error });
  }

  const allOk = steps.every((s) => s.status === "done");
  try {
    await writeStructuredMetadata(publicId, {
      category,
      color,
      fabric: "",
      occasion: "",
      status: allOk ? "ready" : "failed",
    });
    steps.push({ step: "metadata", status: "done" });
  } catch (err) {
    const error = errorMessage(err);
    console.error(`[pipeline:${publicId}] metadata failed:`, error);
    steps.push({ step: "metadata", status: "failed", error });
  }

  const finalOk = steps.every((s) => s.status === "done");
  await prisma.garment.upsert({
    where: { publicId },
    create: { publicId, status: finalOk ? "ready" : "failed" },
    update: { status: finalOk ? "ready" : "failed" },
  });

  return { garmentId: publicId, steps };
}

export type VariantKind = "background" | "recolor";

export interface VariantResult {
  kind: VariantKind;
  presetId: string;
  status: PipelineStepStatus;
  error?: string;
}

export interface VariantsResult {
  garmentId: string;
  variants: VariantResult[];
}

interface EagerEntry {
  secure_url?: string;
  error?: { message?: string };
}

/**
 * Generates the 3 background-replace + 4 recolor variants (Sep 23-25 generative layer) in one
 * eager call, once per garment, on demand — not automatically at upload time. See
 * docs/decisions.md for why this is a separate, explicit action rather than part of
 * runPipeline(): it's ~7x the generative cost of the core pipeline, and CLAUDE.md's own
 * timeline already treats "generative layer" as a distinct step from "core pipeline".
 */
export async function generateVariants(publicId: string): Promise<VariantsResult> {
  const cloudinary = getCloudinaryClient();

  const jobs: { kind: VariantKind; presetId: string; transformation: string }[] = [
    ...BACKGROUND_PRESETS.map((preset) => ({
      kind: "background" as const,
      presetId: preset.id,
      transformation: buildGenBackgroundReplaceTransformation(preset.id),
    })),
    ...RECOLOR_PALETTE.map((swatch) => ({
      kind: "recolor" as const,
      presetId: swatch.id,
      transformation: buildGenRecolorTransformation(swatch.id),
    })),
  ];

  let variants: VariantResult[];
  try {
    const response = await cloudinary.uploader.explicit(publicId, {
      type: "upload",
      eager: jobs.map((job) => job.transformation),
    });
    const eagerResults: EagerEntry[] = Array.isArray(response?.eager) ? response.eager : [];

    // Inspected per-entry rather than assumed — generative effects fail individually far more
    // often than the free cutout/crop calls (rate limits, content policy, etc).
    variants = jobs.map((job, index) => {
      const entry = eagerResults[index];
      if (entry?.secure_url) {
        return { kind: job.kind, presetId: job.presetId, status: "done" as const };
      }
      return {
        kind: job.kind,
        presetId: job.presetId,
        status: "failed" as const,
        error: entry?.error?.message ?? "no derived asset returned for this eager transformation",
      };
    });
  } catch (err) {
    const error = errorMessage(err);
    console.error(`[pipeline:${publicId}] generateVariants failed:`, error);
    variants = jobs.map((job) => ({ kind: job.kind, presetId: job.presetId, status: "failed" as const, error }));
  }

  // Only mark generated if every variant succeeded — the dashboard renders all-or-nothing, so a
  // partial failure must leave the button available for a (cheap, cache-hitting) retry.
  if (variants.every((v) => v.status === "done")) {
    await prisma.garment.update({
      where: { publicId },
      data: { variantsGeneratedAt: new Date() },
    });
  }

  return { garmentId: publicId, variants };
}
