/**
 * run-sql-http.mjs
 *
 * Executes schema.sql then init.sql against Neon using the HTTP driver
 * (port 443 only — no TCP port 5432 required).
 *
 * Usage:
 *   node scripts/run-sql-http.mjs
 */

import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { config } from "dotenv";

config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL is not set in .env");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

/**
 * Split a SQL file into individual executable statements.
 * Handles:
 *  - Single-line -- comments (stripped)
 *  - Multi-statement blocks (DO $$ ... $$ ; treated as one unit)
 *  - TRUNCATE, CREATE, INSERT, ALTER, etc.
 */
function parseStatements(raw) {
  // Strip BOM if present
  const clean = raw.replace(/^\uFEFF/, "");
  const statements = [];
  let current = "";
  let inDollarBlock = false;

  for (const line of clean.split(/\r?\n/)) {
    const trimmed = line.trim();

    // Skip pure comment lines when not inside a block
    if (!inDollarBlock && trimmed.startsWith("--")) continue;

    // Toggle dollar-quote block state
    const dollarMatches = trimmed.match(/\$\$/g) || [];
    if (dollarMatches.length % 2 !== 0) {
      inDollarBlock = !inDollarBlock;
    }

    current += line + "\n";

    // A statement ends at ";" only when we're not inside a $$ block
    if (!inDollarBlock && trimmed.endsWith(";")) {
      const stmt = current.trim();
      if (stmt) statements.push(stmt);
      current = "";
    }
  }

  // Catch any trailing statement without trailing semicolon
  if (current.trim()) statements.push(current.trim());

  return statements.filter((s) => s.length > 0 && !s.startsWith("--"));
}

async function runFile(filePath, label) {
  console.log(`\n📄  Running ${label}...`);
  const raw = readFileSync(filePath, "utf-8");
  const statements = parseStatements(raw);
  console.log(`   Found ${statements.length} statement(s)`);

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.replace(/\n/g, " ").slice(0, 70);
    try {
      // sql.query() accepts raw SQL strings (not tagged-template)
      await sql.query(stmt);
      console.log(`   ✓ [${i + 1}/${statements.length}] ${preview}`);
      passed++;
    } catch (err) {
      // Ignore "already exists" errors from schema re-runs
      if (
        err.message.includes("already exists") ||
        err.message.includes("duplicate key")
      ) {
        console.log(`   ~ [${i + 1}/${statements.length}] (already exists, skipped) ${preview}`);
        passed++;
      } else {
        console.error(`   ✗ [${i + 1}/${statements.length}] FAILED`);
        console.error(`     SQL  : ${preview}`);
        console.error(`     Error: ${err.message}`);
        failed++;
      }
    }
  }

  console.log(`   Result: ${passed} ok, ${failed} failed`);
  return failed;
}

async function main() {
  console.log("🚀  CASFETA CUD — Database Initialisation (Neon HTTP / port 443)");

  try {
    await sql.query("SELECT 1");
    console.log("✅  Neon connection OK");
  } catch (err) {
    console.error("❌  Cannot reach Neon:", err.message);
    process.exit(1);
  }

  let totalFailed = 0;

  // Step 1: Create all tables
  totalFailed += await runFile(join(root, "schema.sql"), "schema.sql (create tables & indexes)");

  // Step 2: Seed initial data
  totalFailed += await runFile(join(root, "init.sql"),   "init.sql (superadmin + skills + ministries + settings)");

  if (totalFailed === 0) {
    console.log("\n🎉  Database ready!");
  } else {
    console.log(`\n⚠️   Done with ${totalFailed} failure(s). Review errors above.`);
  }

  console.log("\n   Login credentials");
  console.log("   ─────────────────────────────");
  console.log("   Username : password");
  console.log("   Email    : jamessebronmwalubandu@gmail.com");
  console.log("   Password : password\n");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
