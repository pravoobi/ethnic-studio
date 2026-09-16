import { NextResponse } from "next/server";

// TODO(sep19-22): sign the upload params server-side using lib/cloudinary/client.ts
// once the upload preset (auto-tagging + background removal add-ons) is confirmed live.
export async function POST() {
  return NextResponse.json(
    { error: "Signed upload is not implemented yet. Core pipeline work starts Sep 19-22." },
    { status: 501 }
  );
}
