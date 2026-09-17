import "server-only";
import { PrismaClient } from "@prisma/client";

// Standard Next.js dev-mode singleton: hot reload re-runs this module, and each new
// PrismaClient opens its own connection pool — without caching on globalThis, dev quickly
// exhausts SQLite's connection limit.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
