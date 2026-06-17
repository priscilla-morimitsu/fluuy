// Intentionally no "server-only" import: this module is also loaded by
// prisma/seed.ts via tsx outside the Next.js build, where that guard throws
// unconditionally. Next's RSC boundary already fails the build if a
// "use client" file imports this.
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
