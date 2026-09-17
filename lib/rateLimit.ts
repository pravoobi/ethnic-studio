// Rate limiting for POST /api/sign-upload (CLAUDE.md: "rate-limited upload route"). Backed by
// the shared Postgres DB rather than an in-memory map — Vercel functions are stateless and
// multi-instance, so in-memory state wouldn't actually limit anything in prod. Protects the
// thing CLAUDE.md calls the scarce resource: Cloudinary credits, against upload spam on a
// public demo URL.

import "server-only";
import { prisma } from "./db";

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS_PER_WINDOW = 5;

export function extractClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const [first] = forwardedFor.split(",");
    return first.trim();
  }
  return "unknown";
}

/** Returns whether this IP is allowed to sign another upload right now. Records the attempt if so. */
export async function checkUploadRateLimit(ipAddress: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - WINDOW_MS);

  await prisma.uploadAttempt.deleteMany({ where: { createdAt: { lt: cutoff } } });

  const recentCount = await prisma.uploadAttempt.count({
    where: { ipAddress, createdAt: { gte: cutoff } },
  });

  if (recentCount >= MAX_ATTEMPTS_PER_WINDOW) {
    return false;
  }

  await prisma.uploadAttempt.create({ data: { ipAddress } });
  return true;
}
