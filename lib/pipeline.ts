// Pipeline orchestration (CLAUDE.md §"Cloudinary pipeline (the product)").
// Signature only for now; real implementation lands in the Sep 19-22 core pipeline phase,
// wiring together lib/cloudinary/{client,metadata}.ts and the transform builders.

export type PipelineStepName = "cutout" | "tag" | "crop" | "metadata";
export type PipelineStepStatus = "pending" | "running" | "done" | "failed";

export interface PipelineStepResult {
  step: PipelineStepName;
  status: PipelineStepStatus;
  error?: string;
}

export interface PipelineResult {
  garmentId: string;
  steps: PipelineStepResult[];
}

export async function runPipeline(_garmentId: string): Promise<PipelineResult> {
  throw new Error("runPipeline is not implemented yet — core pipeline work starts Sep 19-22.");
}
