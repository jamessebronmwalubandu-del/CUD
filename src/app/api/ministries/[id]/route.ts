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

const GET = withErrorHandler(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "MINISTRY_VIEW");

  const { id } = await ctx.params;
  const ministry = await db.ministry.findUnique({
    where: { id },
    include: {
      leader: true,
      assistantLeader: true,
      members: {
        include: { member: { include: { skills: { include: { skill: true } } } } },
        orderBy: { joinedAt: "asc" },
      },
      documents: true,
      announcements: { orderBy: { createdAt: "desc" }, take: 10 },
      _count: { select: { attendanceSessions: true } },
    },
  });
  if (!ministry) return notFound("Ministry not found.");
  return ok(ministry);
});

const PUT = withErrorHandler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "MINISTRY_MANAGE");

  const { id } = await ctx.params;
  const existing = await db.ministry.findUnique({ where: { id } });
  if (!existing) return notFound("Ministry not found.");

  const body = await req.json().catch(() => null);
  if (!body) return badRequest("Invalid body.");

  await db.ministry.update({
    where: { id },
    data: {
      name: body.name ?? existing.name,
      description: body.description ?? existing.description,
      color: body.color ?? existing.color,
      leaderId: body.leaderId === undefined ? existing.leaderId : body.leaderId || null,
      assistantLeaderId: body.assistantLeaderId === undefined ? existing.assistantLeaderId : body.assistantLeaderId || null,
    },
  });

  // Sync leader/assistant as MinistryMembers
  if (body.leaderId !== undefined) {
    if (body.leaderId) {
      const existingMM = await db.ministryMember.findUnique({
        where: { ministryId_memberId: { ministryId: id, memberId: body.leaderId } },
      });
      if (existingMM) {
        await db.ministryMember.update({
          where: { ministryId_memberId: { ministryId: id, memberId: body.leaderId } },
          data: { role: "LEADER" },
        });
      } else {
        await db.ministryMember.create({
          data: { ministryId: id, memberId: body.leaderId, role: "LEADER" },
        });
      }
    }
    if (existing.leaderId && existing.leaderId !== body.leaderId) {
      await db.ministryMember.updateMany({
        where: { ministryId: id, memberId: existing.leaderId },
        data: { role: "MEMBER" },
      });
    }
  }

  const updated = await db.ministry.findUnique({
    where: { id },
    include: { leader: true, assistantLeader: true },
  });

  await auditLog({
    actorId: current.user.memberId,
    action: "UPDATE",
    module: "MINISTRIES",
    entityId: id,
    entityType: "Ministry",
    description: `Updated ministry '${updated?.name ?? id}'.`,
  });

  return ok(updated);
});

const DELETE = withErrorHandler(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "MINISTRY_MANAGE");

  const { id } = await ctx.params;
  const existing = await db.ministry.findUnique({ where: { id } });
  if (!existing) return notFound("Ministry not found.");

  await db.ministry.delete({ where: { id } });

  await auditLog({
    actorId: current.user.memberId,
    action: "DELETE",
    module: "MINISTRIES",
    entityId: id,
    entityType: "Ministry",
    description: `Deleted ministry '${existing.name}'.`,
  });

  return ok({ success: true });
});

// POST /api/ministries/[id] — add member
const POST = withErrorHandler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "MINISTRY_MANAGE");

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body?.memberId) return badRequest("memberId is required.");

  const ministry = await db.ministry.findUnique({ where: { id } });
  if (!ministry) return notFound("Ministry not found.");

  const existingMM = await db.ministryMember.findUnique({
    where: { ministryId_memberId: { ministryId: id, memberId: body.memberId } },
  });
  if (existingMM) {
    await db.ministryMember.update({
      where: { ministryId_memberId: { ministryId: id, memberId: body.memberId } },
      data: { role: body.role || "MEMBER" },
    });
  } else {
    await db.ministryMember.create({
      data: {
        ministryId: id,
        memberId: body.memberId,
        role: body.role || "MEMBER",
      },
    });
  }

  const mm = await db.ministryMember.findUnique({
    where: { ministryId_memberId: { ministryId: id, memberId: body.memberId } },
    include: { member: true },
  });

  await auditLog({
    actorId: current.user.memberId,
    action: "CREATE",
    module: "MINISTRIES",
    entityId: id,
    entityType: "MinistryMember",
    description: `Added ${mm?.member?.fullName ?? body.memberId} to ministry '${ministry.name}'.`,
  });

  return ok(mm);
});

export { GET, PUT, DELETE, POST };
