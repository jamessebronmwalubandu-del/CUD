/**
 * Prisma DB client — singleton pattern for Next.js.
 *
 * Uses PrismaNeonHttp + neon() HTTP driver so ALL database traffic goes over
 * HTTPS (port 443) — NOT raw TCP port 5432.
 *
 * Confirmed working: neon() HTTP function successfully connects and queries.
 * PrismaNeonHttp wraps neon() as a Prisma driver adapter.
 *
 * Next.js loads .env.local automatically — no dotenv import needed.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaNeonHTTP } from "@prisma/adapter-neon";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      "[db] DATABASE_URL is not set. Add it to .env.local at the project root."
    );
  }

  // PrismaNeonHTTP (v6 adapter) takes the connection string and optional options.
  // It creates its own neon() HTTP client internally.
  const adapter = new PrismaNeonHTTP(url, {});

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const db: PrismaClient = global.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma = db;
}

export { db };