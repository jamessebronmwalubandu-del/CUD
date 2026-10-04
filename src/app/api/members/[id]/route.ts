import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { authorize } from "@/lib/rbac/permissions";
import { auditLog } from "@/lib/services/audit";
import {
  ok,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  serverError,
  withErrorHandler,
} from "@/lib/utils/api";

export const runtime = "nodejs";

// GET /api/members/[id]
const GET = withErrorHandler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "MEMBER_VIEW");

  const { id } = await ctx.params;
  const member = await db.member.findUnique({
    where: { id },
    include: {
      skills: { include: { skill: true } },
      ministries: { include: { ministry: true } },
      attendance: {
        include: { session: true },
        orderBy: { recordedAt: "desc" },
        take: 30,
      },
      user: { select: { id: true, role: true, username: true, email: true, isActive: true, lastLoginAt: true } },
    },
  });
  if (!member) return notFound("Member not found.");
  return ok(member);
});

// PUT /api/members/[id]
const PUT = withErrorHandler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "MEMBER_UPDATE");

  const { id } = await ctx.params;
  const existing = await db.member.findUnique({ where: { id } });
  if (!existing) return notFound("Member not found.");

  const body = await req.json().catch(() => null);
  if (!body) return badRequest("Invalid body.");

  if (body.regNumber && body.regNumber !== existing.regNumber) {
    const conflict = await db.member.findUnique({ where: { regNumber: body.regNumber } });
    if (conflict) return serverError("CONFLICT:Registration number already in use.");
  }
  if (body.email && body.email !== existing.email) {
    const conflict = await db.member.findUnique({ where: { email: body.email } });
    if (conflict) return serverError("CONFLICT:Email already in use.");
  }

  const allowed = [
    "fullName", "regNumber", "phoneNumber", "email", "gender",
    "faculty", "department", "course", "yearOfStudy", "hostel",
    "homeRegion", "emergencyContact", "profilePhoto", "biography", "status",
  ];
  const data: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) data[k] = body[k] ?? null;

  const updated = await db.member.update({ where: { id }, data });

  await auditLog({
    actorId: current.user.memberId,
    action: "UPDATE",
    module: "MEMBERS",
    entityId: id,
    entityType: "Member",
    description: `Updated member ${updated.fullName}.`,
    metadata: { fields: Object.keys(data) },
  });

  return ok(updated);
});

// DELETE /api/members/[id]
const DELETE = withErrorHandler(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "MEMBER_DELETE");

  const { id } = await ctx.params;
  const existing = await db.member.findUnique({ where: { id } });
  if (!existing) return notFound("Member not found.");

  await db.member.delete({ where: { id } });

  await auditLog({
    actorId: current.user.memberId,
    action: "DELETE",
    module: "MEMBERS",
    entityId: id,
    entityType: "Member",
    description: `Deleted member ${existing.fullName} (${existing.regNumber}).`,
  });

  return ok({ success: true });
});

export { GET, PUT, DELETE };
