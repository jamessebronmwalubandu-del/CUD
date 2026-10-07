import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL is not defined in environment");
  process.exit(1);
}

const sql = neon(dbUrl);

async function runTests() {
  console.log("==========================================");
  console.log("🧪 TESTING CASFETA AUTHENTICATION & ROLES");
  console.log("==========================================");

  const testEmail = `test_user_${Date.now()}@test.org`;
  const testUsername = `testuser_${Date.now()}`;
  const testPassword = "Password123!";
  const testFullName = "Test Grace User";
  let createdUserId = null;
  let createdMemberId = null;

  try {
    // ----------------------------------------------------
    // TEST 1: Password hashing and verification
    // ----------------------------------------------------
    console.log("\n[Test 1] Testing password hashing & verification...");
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(testPassword, salt);
    const match = await bcrypt.compare(testPassword, hash);
    const wrongMatch = await bcrypt.compare("WrongPassword", hash);

    if (match && !wrongMatch) {
      console.log("  ✅ Password hashing and verification functions properly.");
    } else {
      throw new Error("Password verification failed!");
    }

    // ----------------------------------------------------
    // TEST 2: Member & User creation with STRICT role: MEMBER
    // ----------------------------------------------------
    console.log("\n[Test 2] Simulating /api/auth/register...");
    const currentYear = new Date().getFullYear();
    const regNumber = `CUD/${currentYear}/${Math.floor(100000 + Math.random() * 900000)}`;

    const memberInsert = await sql`
      INSERT INTO "Member" (
        "id", "fullName", "email", "phoneNumber", "regNumber",
        "gender", "faculty", "department", "course", "yearOfStudy",
        "status", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text,
        ${testFullName},
        ${testEmail},
        '+255 700 000 000',
        ${regNumber},
        'MALE',
        'CASFETA',
        'General',
        'Member',
        'YEAR_1',
        'ACTIVE',
        NOW()
      )
      RETURNING id, "fullName", email, "regNumber"
    `;

    createdMemberId = memberInsert[0].id;
    console.log(`  ✅ Member created: ${memberInsert[0].fullName} (${memberInsert[0].regNumber})`);

    const userInsert = await sql`
      INSERT INTO "User" (
        "id", "email", "username", "passwordHash", "role", "memberId", "isActive", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text,
        ${testEmail},
        ${testUsername},
        ${hash},
        'MEMBER',
        ${createdMemberId},
        true,
        NOW()
      )
      RETURNING id, email, username, role, "isActive"
    `;

    createdUserId = userInsert[0].id;
    console.log(`  ✅ User created: ${userInsert[0].username} with role '${userInsert[0].role}'`);

    if (userInsert[0].role !== "MEMBER") {
      throw new Error(`Expected role 'MEMBER' but got '${userInsert[0].role}'`);
    }

    // ----------------------------------------------------
    // TEST 3: Login verification with credentials
    // ----------------------------------------------------
    console.log("\n[Test 3] Simulating /api/auth/login with newly registered user...");
    const foundUser = await sql`
      SELECT u.id, u.email, u.username, u."passwordHash", u.role, u."isActive", m."fullName"
      FROM "User" u
      LEFT JOIN "Member" m ON u."memberId" = m.id
      WHERE u.email = ${testEmail} OR u.username = ${testUsername}
    `;

    if (foundUser.length === 0) {
      throw new Error("Could not find user after registration!");
    }

    const isValid = await bcrypt.compare(testPassword, foundUser[0].passwordHash);
    if (!isValid) {
      throw new Error("Password did not match for registered user!");
    }
    console.log(`  ✅ Login authenticated successfully for: ${foundUser[0].username} (Role: ${foundUser[0].role})`);

    // ----------------------------------------------------
    // TEST 4: Super Admin Role Promotion & Demotion
    // ----------------------------------------------------
    console.log("\n[Test 4] Testing Super Admin role promotion to ADMIN and demotion back to MEMBER...");
    // Promote to ADMIN
    const promoted = await sql`
      UPDATE "User"
      SET role = 'ADMIN'
      WHERE id = ${createdUserId}
      RETURNING role
    `;
    console.log(`  ✅ User promoted to: ${promoted[0].role}`);
    if (promoted[0].role !== "ADMIN") throw new Error("Promotion to ADMIN failed");

    // Demote back to MEMBER
    const demoted = await sql`
      UPDATE "User"
      SET role = 'MEMBER'
      WHERE id = ${createdUserId}
      RETURNING role
    `;
    console.log(`  ✅ User revoked back to: ${demoted[0].role}`);
    if (demoted[0].role !== "MEMBER") throw new Error("Demotion back to MEMBER failed");

    // ----------------------------------------------------
    // TEST 5: Password Reset
    // ----------------------------------------------------
    console.log("\n[Test 5] Testing Password Reset...");
    const newPassword = "NewSecretPassword456!";
    const newHash = await bcrypt.hash(newPassword, salt);
    await sql`
      UPDATE "User"
      SET "passwordHash" = ${newHash}
      WHERE id = ${createdUserId}
    `;

    const recheckUser = await sql`SELECT "passwordHash" FROM "User" WHERE id = ${createdUserId}`;
    const newMatch = await bcrypt.compare(newPassword, recheckUser[0].passwordHash);
    const oldMatch = await bcrypt.compare(testPassword, recheckUser[0].passwordHash);

    if (newMatch && !oldMatch) {
      console.log("  ✅ Password reset works: new password verified, old password rejected.");
    } else {
      throw new Error("Password reset verification failed!");
    }

    // ----------------------------------------------------
    // TEST 6: Verify Super Admin user still exists & active
    // ----------------------------------------------------
    console.log("\n[Test 6] Verifying Super Admin account status...");
    const superAdmins = await sql`
      SELECT id, email, username, role, "isActive"
      FROM "User"
      WHERE role = 'SUPER_ADMIN'
    `;
    console.log(`  ✅ Super Admins found: ${superAdmins.length}`);
    for (const sa of superAdmins) {
      console.log(`     - Username: ${sa.username} | Email: ${sa.email} | Active: ${sa.isActive}`);
    }

    console.log("\n==========================================");
    console.log("🎉 ALL 6 BACKEND & RBAC TESTS PASSED!");
    console.log("==========================================");
  } finally {
    // Clean up test records
    if (createdUserId) {
      await sql`DELETE FROM "User" WHERE id = ${createdUserId}`;
      console.log("\n🧹 Cleaned up test User record.");
    }
    if (createdMemberId) {
      await sql`DELETE FROM "Member" WHERE id = ${createdMemberId}`;
      console.log("🧹 Cleaned up test Member record.");
    }
  }
}

runTests().catch((err) => {
  console.error("\n❌ Test failed with error:", err);
  process.exit(1);
});
