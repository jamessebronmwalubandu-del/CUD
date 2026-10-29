/**
 * Adds MessageReaction table and group description/note column to Conversation.
 * Run: node scripts/create-chat-reactions.mjs
 */
import { neon } from "@neondatabase/serverless";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_StnCJ45HyZvN@ep-morning-cake-b5utmfjz-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = neon(DATABASE_URL);

async function run() {
  console.log("Connecting…");

  // 1. Add description column to Conversation (group note/description)
  await sql`
    ALTER TABLE "Conversation"
      ADD COLUMN IF NOT EXISTS "description" TEXT
  `;
  console.log("✓ Conversation.description column");

  // 2. Create MessageReaction table
  await sql`
    CREATE TABLE IF NOT EXISTS "MessageReaction" (
      "id"        TEXT         NOT NULL,
      "messageId" TEXT         NOT NULL,
      "memberId"  TEXT         NOT NULL,
      "emoji"     TEXT         NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "MessageReaction_pkey" PRIMARY KEY ("id")
    )
  `;
  console.log("✓ MessageReaction table");

  // 3. Unique: one reaction per emoji per member per message
  await sql`
    DO $$ BEGIN
      ALTER TABLE "MessageReaction"
        ADD CONSTRAINT "MessageReaction_messageId_memberId_emoji_key"
        UNIQUE ("messageId", "memberId", "emoji");
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `;

  // 4. Foreign keys
  await sql`
    DO $$ BEGIN
      ALTER TABLE "MessageReaction"
        ADD CONSTRAINT "MessageReaction_messageId_fkey"
        FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `;
  await sql`
    DO $$ BEGIN
      ALTER TABLE "MessageReaction"
        ADD CONSTRAINT "MessageReaction_memberId_fkey"
        FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `;

  // 5. Indexes
  await sql`CREATE INDEX IF NOT EXISTS "MessageReaction_messageId_idx" ON "MessageReaction"("messageId")`;
  await sql`CREATE INDEX IF NOT EXISTS "MessageReaction_memberId_idx" ON "MessageReaction"("memberId")`;

  console.log("✓ Foreign keys + indexes");
  console.log("\n🎉 Reactions migration done!");
}

run().catch((e) => { console.error(e.message); process.exit(1); });
