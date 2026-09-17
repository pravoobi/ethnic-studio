import { NextResponse } from "next/server";
import { z } from "zod";
import { getCloudinaryClient } from "@/lib/cloudinary/client";
import { checkUploadRateLimit, extractClientIp } from "@/lib/rateLimit";

// Standard Cloudinary upload-widget signed-upload contract: the widget POSTs whatever upload
// params it's about to send as `paramsToSign`, we sign exactly those (blindly — Cloudinary
// itself rejects the upload if the actual params don't match the signature), and return it.
const SignUploadSchema = z.object({
  paramsToSign: z.record(z.string(), z.unknown()),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = SignUploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const ip = extractClientIp(request);
  const allowed = await checkUploadRateLimit(ip).catch((err) => {
    console.error("[sign-upload] rate limit check failed:", err);
    return true; // fail open — a broken rate limiter shouldn't block every upload
  });
  if (!allowed) {
    return NextResponse.json({ error: "Too many uploads — please wait a moment and try again." }, { status: 429 });
  }

  try {
    const cloudinary = getCloudinaryClient();
    const apiSecret = process.env.CLOUDINARY_API_SECRET as string; // presence checked by getCloudinaryClient()
    const signature = cloudinary.utils.api_sign_request(
      parsed.data.paramsToSign as Record<string, string | number>,
      apiSecret
    );
    return NextResponse.json({ signature });
  } catch (err) {
    console.error("[sign-upload] failed:", err);
    return NextResponse.json({ error: "Could not sign upload" }, { status: 500 });
  }
}
