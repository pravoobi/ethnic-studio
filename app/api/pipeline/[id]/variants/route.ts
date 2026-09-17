import { NextResponse } from "next/server";
import { generateVariants } from "@/lib/pipeline";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const result = await generateVariants(id);
    return NextResponse.json(result);
  } catch (err) {
    console.error(`[pipeline/${id}/variants] unexpected failure:`, err);
    return NextResponse.json({ error: "Variant generation failed unexpectedly" }, { status: 500 });
  }
}
