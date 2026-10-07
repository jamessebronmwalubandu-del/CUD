/**
 * Prisma DB client — singleton pattern for Next.js.
 *
 * Direct secure connection to PostgreSQL over SSL (sslmode=require).
 * Full native support for transactions, nested queries, relations, and connection pooling.
 */

import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const db: PrismaClient = global.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma = db;
}

export { db };