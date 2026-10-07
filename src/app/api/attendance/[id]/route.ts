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
  authorize(current.user.role, "ATTENDANCE_VIEW");

  const { id } = await ctx.params;
  const session = await db.attendanceSession.findUnique({
    where: { id },
    include: {
      ministry: true,
      records: {
        include: { member: true },
        orderBy: { member: { fullName: "asc" } },
      },
    },
  });
  if (!session) return notFound("Session not found.");
  return ok(session);
});

const PUT = withErrorHandler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "ATTENDANCE_RECORD");

  const { id } = await ctx.params;
  const existing = await db.attendanceSession.findUnique({ where: { id } });
  if (!existing) return notFound("Session not found.");

  const body = await req.json().catch(() => null);
  if (!body) return badRequest("Invalid body.");

  const updated = await db.attendanceSession.update({
    where: { id },
    data: {
      title: body.title ?? existing.title,
      type: body.type ?? existing.type,
      date: body.date ? new Date(body.date) : existing.date,
      ministryId: body.ministryId === undefined ? existing.ministryId : body.ministryId || null,
      notes: body.notes ?? existing.notes,
    },
  });

  // Update records (present flags) if provided
  if (Array.isArray(body.records)) {
    for (const r of body.records) {
      if (!r.memberId) continue;
      const existingRecord = await db.attendanceRecord.findUnique({
        where: { sessionId_memberId: { sessionId: id, memberId: r.memberId } },
      });
      if (existingRecord) {
        await db.attendanceRecord.update({
          where: { sessionId_memberId: { sessionId: id, memberId: r.memberId } },
          data: { present: !!r.present, reason: r.reason ?? null },
        });
      } else {
        await db.attendanceRecord.create({
          data: { sessionId: id, memberId: r.memberId, present: !!r.present, reason: r.reason ?? null },
        });
      }
    }
  }

  await auditLog({
    actorId: current.user.memberId,
    action: "UPDATE",
    module: "ATTENDANCE",
    entityId: id,
    entityType: "AttendanceSession",
    description: `Updated attendance session '${updated.title}'.`,
  });

  return ok(updated);
});

const DELETE = withErrorHandler(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "ATTENDANCE_RECORD");

  const { id } = await ctx.params;
  const existing = await db.attendanceSession.findUnique({ where: { id } });
  if (!existing) return notFound("Session not found.");

  await db.attendanceSession.delete({ where: { id } });

  await auditLog({
    actorId: current.user.memberId,
    action: "DELETE",
    module: "ATTENDANCE",
    entityId: id,
    entityType: "AttendanceSession",
    description: `Deleted attendance session '${existing.title}'.`,
  });

  return ok({ success: true });
});

export { GET, PUT, DELETE };
