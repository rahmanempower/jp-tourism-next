/**
 * lib/prisma.js
 * Prisma Client singleton for Next.js (App Router)
 *
 * In development, Next.js hot-reload creates new module instances on every
 * reload. Attaching the client to `globalThis` ensures a single connection
 * pool is reused across reloads instead of exhausting MongoDB connections.
 *
 * Generated client lives at: app/generated/prisma (see prisma/schema.prisma)
 */

import { PrismaClient } from "../app/generated/prisma/index.js";

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
