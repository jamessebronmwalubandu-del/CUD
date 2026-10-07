import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { auditLog } from "@/lib/services/audit";
import { ok, badRequest, withErrorHandler } from "@/lib/utils/api";

export const runtime = "nodejs";

/**
 * POST /api/auth/register
 * Allows new members to register for the CASFETA CUD Management System.
 * Security rules:
 * - Default role is strictly "MEMBER". No user can self-assign "ADMIN" or "SUPER_ADMIN".
 * - Generates both Member and User records in a single transaction.
 * - Automatically creates a session upon successful registration.
 */
const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json().catch(() => null);
  if (!body) return badRequest("Invalid JSON body.");

  const fullName = (body.fullName as string | undefined)?.trim();
  const email = (body.email as string | undefined)?.trim().toLowerCase();
  const username = (body.username as string | undefined)?.trim().toLowerCase();
  const password = (body.password as string | undefined) ?? "";
  const phoneNumber = (body.phoneNumber as string | undefined)?.trim();

  // Basic validation
  if (!fullName || fullName.length < 2) {
    return badRequest("Full name is required (at least 2 characters).");
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return badRequest("A valid email address is required.");
  }

  if (!username || username.length < 3) {
    return badRequest("Username is required (at least 3 characters).");
  }

  // Validate username characters (alphanumeric, underscore, dash)
  if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
    return badRequest("Username can only contain letters, numbers, dots, and underscores.");
  }

  if (!password || password.length < 6) {
    return badRequest("Password must be at least 6 characters long.");
  }

  // Check email uniqueness across User and Member
  const existingUserEmail = await db.user.findUnique({ where: { email } });
  if (existingUserEmail) {
    return badRequest("An account with this email address already exists.");
  }

  // Check username uniqueness
  const existingUserUsername = await db.user.findUnique({ where: { username } });
  if (existingUserUsername) {
    return badRequest("This username is already taken. Please choose another.");
  }

  // Hash password with bcrypt
  const passwordHash = await hashPassword(password);

  // Generate unique regNumber (e.g. CUD/2026/123456)
  const currentYear = new Date().getFullYear();
  let regNumber = `CUD/${currentYear}/${Math.floor(100000 + Math.random() * 900000)}`;
  while (await db.member.findUnique({ where: { regNumber } })) {
    regNumber = `CUD/${currentYear}/${Math.floor(100000 + Math.random() * 900000)}`;
  }

  // Create Member and User in a transaction.
  // Note: Role is strictly hardcoded to "MEMBER".
  const { user, member } = await db.$transaction(async (tx) => {
    const newMember = await tx.member.create({
      data: {
        fullName,
        email,
        phoneNumber: phoneNumber || "Not provided",
        regNumber,
        gender: "MALE", // Default; member can update in their profile
        faculty: "CASFETA",
        department: "General",
        course: "Member",
        yearOfStudy: "YEAR_1",
        status: "ACTIVE",
      },
    });

    const newUser = await tx.user.create({
      data: {
        email,
        username,
        passwordHash,
        role: "MEMBER", // Strictly normal member role!
        memberId: newMember.id,
        isActive: true,
      },
    });

    return { user: newUser, member: newMember };
  });

  // Create session so the user is immediately logged in
  await createSession({
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    memberId: user.memberId,
    name: member.fullName,
  });

  // Audit log the registration
  await auditLog({
    actorId: member.id,
    action: "CREATE",
    module: "AUTH",
    entityId: user.id,
    entityType: "User",
    description: `New user '${user.username}' signed up with role 'MEMBER'.`,
    metadata: { username: user.username, email: user.email, role: user.role },
  });

  return ok({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      memberId: user.memberId,
      name: member.fullName,
    },
  });
});

export { POST };
