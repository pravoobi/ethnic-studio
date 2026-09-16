import { NextResponse } from "next/server";

// TODO(sep23-25): build a zip of marketplace crops (lib/presets.ts EXPORT_PRESETS) for this garment.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(
    { error: `Export for garment "${id}" is not implemented yet. Generative layer work starts Sep 23-25.` },
    { status: 501 }
  );
}
