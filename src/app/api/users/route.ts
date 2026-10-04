import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { authorize } from "@/lib/rbac/permissions";
import { auditLog } from "@/lib/services/audit";
import {
  ok,
  badRequest,
  unauthorized,
  notFound,
  withErrorHandler,
} from "@/lib/utils/api";

export const runtime = "nodejs";

// GET /api/users — list all users (super admin only)
const GET = withErrorHandler(async (req: NextRequest) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "USER_MANAGE");

  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");
  const where: Record<string, unknown> = {};
  if (role) where.role = role;

  const items = await db.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { member: { select: { id: true, fullName: true, regNumber: true } } },
  });

  return ok({
    items: items.map((u) => ({
      id: u.id,
      email: u.email,
      username: u.username,
      role: u.role,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
      member: u.member,
    })),
  });
});

export { GET };
