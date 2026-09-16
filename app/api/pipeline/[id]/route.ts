import { NextResponse } from "next/server";

// TODO(sep19-22): call lib/pipeline.ts runPipeline() and persist derived URLs.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(
    { error: `Pipeline for garment "${id}" is not implemented yet. Core pipeline work starts Sep 19-22.` },
    { status: 501 }
  );
}
