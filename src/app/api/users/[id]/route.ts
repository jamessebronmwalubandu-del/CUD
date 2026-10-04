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

// PATCH /api/users/[id] — update role / isActive
const PATCH = withErrorHandler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "USER_MANAGE");

  const { id } = await ctx.params;
  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) return notFound("User not found.");

  const body = await req.json().catch(() => null);
  if (!body) return badRequest("Invalid body.");

  const data: Record<string, unknown> = {};
  if (body.role && ["SUPER_ADMIN", "ADMIN", "MEMBER"].includes(body.role)) data.role = body.role;
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;

  const updated = await db.user.update({ where: { id }, data });

  await auditLog({
    actorId: current.user.memberId,
    action: "UPDATE",
    module: "AUTH",
    entityId: id,
    entityType: "User",
    description: `Updated user '${updated.username}' — role=${updated.role}, isActive=${updated.isActive}.`,
    metadata: data,
  });

  return ok({
    id: updated.id,
    email: updated.email,
    username: updated.username,
    role: updated.role,
    isActive: updated.isActive,
  });
});

export { PATCH };
