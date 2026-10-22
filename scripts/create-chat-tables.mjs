/**
 * Creates the Chat tables (Conversation, ConversationParticipant, Message)
 * in the Neon database via the HTTP-based serverless driver.
 *
 * Run once:  node scripts/create-chat-tables.mjs
 */
import { neon } from "@neondatabase/serverless";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_StnCJ45HyZvN@ep-morning-cake-b5utmfjz-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = neon(DATABASE_URL);

async function run() {
  console.log("Connecting to Neon…");

  // 1. Create tables
  await sql`
    CREATE TABLE IF NOT EXISTS "Conversation" (
      "id"          TEXT        NOT NULL,
      "type"        TEXT        NOT NULL DEFAULT 'DIRECT',
      "name"        TEXT,
      "avatarUrl"   TEXT,
      "createdById" TEXT,
      "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
    )
  `;
  console.log("✓ Conversation table");

  await sql`
    CREATE TABLE IF NOT EXISTS "ConversationParticipant" (
      "id"             TEXT         NOT NULL,
      "conversationId" TEXT         NOT NULL,
      "memberId"       TEXT         NOT NULL,
      "joinedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "lastReadAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
    )
  `;
  console.log("✓ ConversationParticipant table");

  await sql`
    CREATE TABLE IF NOT EXISTS "Message" (
      "id"             TEXT         NOT NULL,
      "conversationId" TEXT         NOT NULL,
      "senderId"       TEXT         NOT NULL,
      "type"           TEXT         NOT NULL DEFAULT 'TEXT',
      "content"        TEXT         NOT NULL,
      "fileName"       TEXT,
      "fileSize"       INTEGER,
      "deleted"        BOOLEAN      NOT NULL DEFAULT false,
      "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
    )
  `;
  console.log("✓ Message table");

  // 2. Unique constraint
  await sql`
    DO $$ BEGIN
      ALTER TABLE "ConversationParticipant"
        ADD CONSTRAINT "ConversationParticipant_conversationId_memberId_key"
        UNIQUE ("conversationId", "memberId");
    EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL;
    END $$
  `;
  console.log("✓ Unique constraint on ConversationParticipant");

  // 3. Foreign keys
  await sql`
    DO $$ BEGIN
      ALTER TABLE "ConversationParticipant"
        ADD CONSTRAINT "ConversationParticipant_conversationId_fkey"
        FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `;

  await sql`
    DO $$ BEGIN
      ALTER TABLE "ConversationParticipant"
        ADD CONSTRAINT "ConversationParticipant_memberId_fkey"
        FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `;

  await sql`
    DO $$ BEGIN
      ALTER TABLE "Message"
        ADD CONSTRAINT "Message_conversationId_fkey"
        FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `;

  await sql`
    DO $$ BEGIN
      ALTER TABLE "Message"
        ADD CONSTRAINT "Message_senderId_fkey"
        FOREIGN KEY ("senderId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `;
  console.log("✓ Foreign keys");

  // 4. Indexes
  await sql`CREATE INDEX IF NOT EXISTS "Conversation_type_idx"      ON "Conversation"("type")`;
  await sql`CREATE INDEX IF NOT EXISTS "Conversation_updatedAt_idx"  ON "Conversation"("updatedAt")`;
  await sql`CREATE INDEX IF NOT EXISTS "ConvParticipant_memberId_idx" ON "ConversationParticipant"("memberId")`;
  await sql`CREATE INDEX IF NOT EXISTS "Message_conv_createdAt_idx"  ON "Message"("conversationId", "createdAt")`;
  await sql`CREATE INDEX IF NOT EXISTS "Message_senderId_idx"        ON "Message"("senderId")`;
  console.log("✓ Indexes");

  console.log("\n🎉 Chat tables created successfully!");
}

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
