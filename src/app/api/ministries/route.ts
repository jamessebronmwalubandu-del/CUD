import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { authorize } from "@/lib/rbac/permissions";
import { auditLog } from "@/lib/services/audit";
import {
  ok,
  created,
  badRequest,
  unauthorized,
  notFound,
  conflict,
  withErrorHandler,
} from "@/lib/utils/api";

export const runtime = "nodejs";

const GET = withErrorHandler(async () => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "MINISTRY_VIEW");

  const ministries = await db.ministry.findMany({
    include: {
      leader: true,
      assistantLeader: true,
      members: { include: { member: true } },
      _count: { select: { documents: true, attendanceSessions: true, announcements: true } },
    },
    orderBy: { name: "asc" },
  });

  return ok({ items: ministries });
});

const POST = withErrorHandler(async (req: NextRequest) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "MINISTRY_MANAGE");

  const body = await req.json().catch(() => null);
  if (!body?.name) return badRequest("Ministry name is required.");

  const existing = await db.ministry.findUnique({ where: { name: body.name } });
  if (existing) return conflict("Ministry already exists.");

  const ministry = await db.ministry.create({
    data: {
      name: body.name,
      description: body.description || null,
      color: body.color || "#0f766e",
      leaderId: body.leaderId || null,
      assistantLeaderId: body.assistantLeaderId || null,
    },
    include: { leader: true, assistantLeader: true },
  });

  // If leader provided, also add as MinistryMember with LEADER role
  if (body.leaderId) {
    await db.ministryMember.upsert({
      where: { ministryId_memberId: { ministryId: ministry.id, memberId: body.leaderId } },
      update: { role: "LEADER" },
      create: { ministryId: ministry.id, memberId: body.leaderId, role: "LEADER" },
    });
  }

  await auditLog({
    actorId: current.user.memberId,
    action: "CREATE",
    module: "MINISTRIES",
    entityId: ministry.id,
    entityType: "Ministry",
    description: `Created ministry '${ministry.name}'.`,
  });

  return created(ministry);
});

export { GET, POST };
