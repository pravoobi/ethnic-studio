import { NextResponse } from "next/server";
import { z } from "zod";
import { runPipeline } from "@/lib/pipeline";
import { GARMENT_CATEGORIES } from "@/lib/presets";

const PipelineRequestSchema = z.object({
  category: z.enum(GARMENT_CATEGORIES),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = PipelineRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await runPipeline(id, parsed.data.category);
    return NextResponse.json(result);
  } catch (err) {
    console.error(`[pipeline/${id}] unexpected failure:`, err);
    return NextResponse.json({ error: "Pipeline failed unexpectedly" }, { status: 500 });
  }
}
