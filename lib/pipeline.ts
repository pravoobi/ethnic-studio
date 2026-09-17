// Pipeline orchestration (CLAUDE.md §"Cloudinary pipeline (the product)").
// Runs post-upload: cutout + crop (one eager call), dominant-color lookup, structured-metadata
// write, then persists orchestration status. Every step is wrapped so one failure doesn't take
// out the rest — CLAUDE.md: "a failed generation must not break the rest of the listing."

import "server-only";
import { getCloudinaryClient } from "./cloudinary/client";
import { fetchDominantColor, writeStructuredMetadata } from "./cloudinary/metadata";
import { buildCutoutTransformation, buildExportTransformation } from "./cloudinary/transforms";
import { prisma } from "./db";
import { EXPORT_PRESETS, type GarmentCategory } from "./presets";

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
