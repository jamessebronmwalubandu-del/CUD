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

// PATCH — change role
const PATCH = withErrorHandler(
  async (
    req: NextRequest,
    ctx: { params: Promise<{ id: string; memberId: string }> }
  ) => {
    const current = await getCurrentUser();
    if (!current) return unauthorized();
    authorize(current.user.role, "MINISTRY_MANAGE");

    const { id, memberId } = await ctx.params;
    const body = await req.json().catch(() => null);
    if (!body?.role) return badRequest("role is required.");

    const mm = await db.ministryMember.findUnique({
      where: { ministryId_memberId: { ministryId: id, memberId } },
    });
    if (!mm) return notFound("Member is not in this ministry.");

    const updated = await db.ministryMember.update({
      where: { id: mm.id },
      data: { role: body.role },
    });

    await auditLog({
      actorId: current.user.memberId,
      action: "UPDATE",
      module: "MINISTRIES",
      entityId: id,
      entityType: "MinistryMember",
      description: `Changed member ${memberId} role to ${body.role}.`,
    });

    return ok(updated);
  }
);

const DELETE = withErrorHandler(
  async (
    _req: NextRequest,
    ctx: { params: Promise<{ id: string; memberId: string }> }
  ) => {
    const current = await getCurrentUser();
    if (!current) return unauthorized();
    authorize(current.user.role, "MINISTRY_MANAGE");

    const { id, memberId } = await ctx.params;
    const mm = await db.ministryMember.findUnique({
      where: { ministryId_memberId: { ministryId: id, memberId } },
    });
    if (!mm) return notFound("Member is not in this ministry.");

    await db.ministryMember.delete({ where: { id: mm.id } });

    await auditLog({
      actorId: current.user.memberId,
      action: "DELETE",
      module: "MINISTRIES",
      entityId: id,
      entityType: "MinistryMember",
      description: `Removed member ${memberId} from ministry.`,
    });

    return ok({ success: true });
  }
);

export { PATCH, DELETE };
