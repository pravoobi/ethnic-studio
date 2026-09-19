import { NextResponse } from "next/server";
import { generateVariants } from "@/lib/pipeline";

// 8 eager generative transforms (3 backgrounds + 4 recolors + 1 video) in one call — measured
// live at ~12s even on an already-cached garment; a first-time (uncached) generation can take
// longer. Without this, Vercel's default function duration (10s) could kill the request mid-call,
// which would look exactly like an intermittent 500 to the caller. 60s is Hobby plan's max.
export const maxDuration = 60;

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
