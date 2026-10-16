import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
config({ path: ".env.local" });
config();

const sql = neon(process.env.DATABASE_URL);

async function main() {
  console.log("Creating Feedback table...");
  await sql`
    CREATE TABLE IF NOT EXISTS "Feedback" (
      "id" TEXT NOT NULL,
      "memberId" TEXT,
      "category" TEXT NOT NULL DEFAULT 'GENERAL',
      "subject" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "adminResponse" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "Feedback_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE
    );
  `;
  console.log("✓ Created Feedback table");

  await sql`CREATE INDEX IF NOT EXISTS "Feedback_category_idx" ON "Feedback"("category");`;
  await sql`CREATE INDEX IF NOT EXISTS "Feedback_status_idx" ON "Feedback"("status");`;
  await sql`CREATE INDEX IF NOT EXISTS "Feedback_createdAt_idx" ON "Feedback"("createdAt");`;
  console.log("✓ Created indexes on Feedback table");

  const count = await sql`SELECT count(*) FROM "Feedback"`;
  console.log("✓ Verified Feedback table exists! Row count:", count);
}

main().catch(console.error);
