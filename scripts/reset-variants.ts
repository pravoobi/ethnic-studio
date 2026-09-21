// Resets the "variants generated" flag so garment cards show "Generate backgrounds, colors &
// video" again instead of "View...". DB-only — deliberately does NOT touch the actual derived
// Cloudinary assets (backgrounds/recolors/video), which stay cached at their deterministic
// transformation URLs. That means a later "Generate" click is an instant, free cache hit that
// reproduces the exact same results, not a fresh (and re-charged) AI generation.
//
// Talks to Postgres directly with its own PrismaClient rather than importing lib/db.ts, which is
// guarded by "server-only" and can't be imported outside a Next.js server bundle (same reasoning
// as every other script in this folder for lib/cloudinary/client.ts).
//
// Run with: pnpm reset-variants            (all garments)
//           pnpm reset-variants <publicId>  (just one)

import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

loadEnv({ path: ".env.local" });

async function main() {
  const publicId = process.argv[2];
  const prisma = new PrismaClient();

  try {
    const result = publicId
      ? await prisma.garment.updateMany({ where: { publicId }, data: { variantsGeneratedAt: null } })
      : await prisma.garment.updateMany({ data: { variantsGeneratedAt: null } });

    if (publicId && result.count === 0) {
      console.error(`No garment found with publicId "${publicId}".`);
      process.exit(1);
    }

    console.log(`Reset ${result.count} garment(s)${publicId ? ` matching "${publicId}"` : ""}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
