// Last updated: 2026-03-16T21:49:00Z
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// ──────────────────────────────────────────────────────────────
// Singleton Prisma client
// In development, Next.js hot-reload creates new module instances
// on every file change. We cache the client on `globalThis` to
// avoid exhausting the Supabase connection pool.
// ──────────────────────────────────────────────────────────────

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ["error"], // only log errors — no query/info leakage
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
