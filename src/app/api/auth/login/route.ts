import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { auditLog } from "@/lib/services/audit";
import { ok, badRequest, unauthorized, serverError, withErrorHandler } from "@/lib/utils/api";

export const runtime = "nodejs";

const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json().catch(() => null);
  if (!body) return badRequest("Invalid JSON body.");

  const identifier = (body.identifier as string | undefined)?.trim();
  const password = (body.password as string | undefined) ?? "";

  if (!identifier || !password) {
    return badRequest("Email/username and password are required.");
  }

  const user = await db.user.findFirst({
    where: {
      OR: [{ email: identifier.toLowerCase() }, { username: identifier }],
    },
    include: { member: true },
  });

  if (!user || !user.isActive) {
    return unauthorized("Invalid credentials or inactive account.");
  }

  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    return unauthorized("Invalid credentials.");
  }

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await createSession({
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    memberId: user.memberId,
    name: user.member?.fullName ?? user.username,
  });

  await auditLog({
    actorId: user.memberId,
    action: "LOGIN",
    module: "AUTH",
    description: `${user.username} logged in.`,
    metadata: { username: user.username, role: user.role },
  });

  return ok({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      memberId: user.memberId,
      name: user.member?.fullName ?? user.username,
    },
  });
});

export { POST };
