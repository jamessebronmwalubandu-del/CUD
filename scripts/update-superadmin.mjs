import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config();

const HASH = "$2b$10$uP1YI4sFf6Miz0j9NoRgkusaZUthtVE6iFHTL6.Yak/JJtiIgd4MC"; // bcrypt("password")
const EMAIL = "jamessebronmwalubandu@gmail.com";

async function run(attempt = 1) {
  try {
    console.log(`Attempt ${attempt} — connecting to Neon...`);
    const sql = neon(process.env.DATABASE_URL);

    // Update User account
    await sql.query(
      `UPDATE "User" SET email = '${EMAIL}', username = 'password', "passwordHash" = '${HASH}' WHERE role = 'SUPER_ADMIN'`
    );

    // Update linked Member profile email
    await sql.query(
      `UPDATE "Member" SET email = '${EMAIL}' WHERE "regNumber" = 'CUD/ADMIN/001'`
    );

    const rows = await sql.query(
      `SELECT username, role, email FROM "User" WHERE role = 'SUPER_ADMIN'`
    );

    console.log("✅ SUPER_ADMIN credentials updated:");
    console.table(rows);
    console.log("  Email    : " + EMAIL);
    console.log("  Username : password");
    console.log("  Password : password");
  } catch (err) {
    console.error(`Attempt ${attempt} failed: ${err.message}`);
    if (attempt < 5) {
      const wait = attempt * 3000;
      console.log(`Retrying in ${wait / 1000}s...`);
      await new Promise((r) => setTimeout(r, wait));
      return run(attempt + 1);
    }
    console.error("All attempts failed. Check your network and try again.");
    process.exit(1);
  }
}

run();
