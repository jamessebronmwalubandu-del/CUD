/**
 * Update admin user email and verify credentials.
 * Run: node scripts/fix-admin.mjs
 */
import { neon } from "@neondatabase/serverless";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const bcrypt = require("bcryptjs");

import { config } from "dotenv";
config({ path: ".env.local" });
config();

const DATABASE_URL = process.env.DATABASE_URL;
const sql = neon(DATABASE_URL);

// Check existing users
const users = await sql`SELECT id, email, username, role, "isActive", "passwordHash", "memberId" FROM "User" LIMIT 10`;
console.log("=== CURRENT USERS ===");
if (users.length === 0) {
  console.log("❌ NO USERS — database is empty! Run init.sql first via the Neon console.");
  process.exit(1);
}

for (const u of users) {
  const match = await bcrypt.compare("password", u.passwordHash);
  console.log(`username=${u.username} | email=${u.email} | role=${u.role} | active=${u.isActive} | password="password" matches: ${match}`);
}

// Update admin email to jamessebronmwalubandu@gmail.com
const targetUser = users.find(u => u.username === "password");
if (targetUser) {
  if (targetUser.email !== "jamessebronmwalubandu@gmail.com") {
    await sql`UPDATE "User" SET email = 'jamessebronmwalubandu@gmail.com' WHERE username = 'password'`;
    if (targetUser.memberId) {
      await sql`UPDATE "Member" SET email = 'jamessebronmwalubandu@gmail.com' WHERE id = ${targetUser.memberId}`;
    }
    console.log("\n✅ Updated admin email to jamessebronmwalubandu@gmail.com");
  } else {
    console.log("\n✅ Admin email already set correctly.");
  }
} else {
  console.log("\n❌ Admin user with username='password' not found.");
}

console.log("\n=== FINAL STATE ===");
const final = await sql`SELECT email, username, role, "isActive" FROM "User"`;
for (const u of final) {
  console.log(`  ${u.username} | ${u.email} | ${u.role} | active=${u.isActive}`);
}
