/**
 * Script to update the admin user password in the Neon database.
 * Run with: node --env-file=.env scripts/reset-admin-password.mjs
 *
 * This sets the password for username "password" to "password"
 * using bcryptjs (cost=10) — the same library the app uses.
 */

import { neon } from "@neondatabase/serverless";

// Load DATABASE_URL from env
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set. Run with: node --env-file=.env scripts/reset-admin-password.mjs");
  process.exit(1);
}

const { default: bcrypt } = await import(
  new URL("../node_modules/bcryptjs/dist/bcrypt.js", import.meta.url).href
).catch(() => import("bcryptjs"));

const newPassword = "password";
const hash = await bcrypt.hash(newPassword, 10);
console.log("Generated hash:", hash);

const sql = neon(DATABASE_URL);

const result = await sql`
  UPDATE "User"
  SET "passwordHash" = ${hash},
      email = 'jamessebronmwalubandu@gmail.com'
  WHERE username = 'password'
  RETURNING id, email, username, role
`;

if (result.length === 0) {
  console.error("❌ No user found with username='password'. Check your database.");
} else {
  console.log("✅ Password updated successfully for:", result[0]);
  console.log(`   Username: ${result[0].username}`);
  console.log(`   Email:    ${result[0].email}`);
  console.log(`   Login with: username=password | password=password`);
}
