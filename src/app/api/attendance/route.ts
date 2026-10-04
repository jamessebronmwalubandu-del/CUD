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
  withErrorHandler,
} from "@/lib/utils/api";

export const runtime = "nodejs";

// GET /api/attendance — list sessions
const GET = withErrorHandler(async (req: NextRequest) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "ATTENDANCE_VIEW");

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const ministryId = searchParams.get("ministryId");
  const fromDate = searchParams.get("from");
  const toDate = searchParams.get("to");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(50, parseInt(searchParams.get("pageSize") ?? "20", 10));

  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (ministryId) where.ministryId = ministryId;
  if (fromDate || toDate) {
    where.date = {};
    if (fromDate) (where.date as Record<string, unknown>).gte = new Date(fromDate);
    if (toDate) (where.date as Record<string, unknown>).lte = new Date(toDate);
  }

  const [total, items] = await Promise.all([
    db.attendanceSession.count({ where }),
    db.attendanceSession.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        ministry: true,
        _count: { select: { records: true } },
      },
    }),
  ]);

  // For each session, compute present count
  const withStats = await Promise.all(
    items.map(async (s) => {
      const presentCount = await db.attendanceRecord.count({
        where: { sessionId: s.id, present: true },
      });
      return { ...s, presentCount, totalCount: s._count.records };
    })
  );

  return ok({ items: withStats, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
});

// POST /api/attendance — create session (optionally with member IDs to mark present)
const POST = withErrorHandler(async (req: NextRequest) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "ATTENDANCE_RECORD");

  const body = await req.json().catch(() => null);
  if (!body?.title || !body?.type || !body?.date) {
    return badRequest("title, type, and date are required.");
  }

  const session = await db.attendanceSession.create({
    data: {
      title: body.title,
      type: body.type,
      date: new Date(body.date),
      ministryId: body.ministryId || null,
      notes: body.notes || null,
    },
  });

  // If presentMemberIds provided, mark them present and others absent
  const presentMemberIds: string[] = Array.isArray(body.presentMemberIds) ? body.presentMemberIds : [];
  const allMembers = await db.member.findMany({ where: { status: "ACTIVE" } });
  if (allMembers.length > 0) {
    await db.attendanceRecord.createMany({
      data: allMembers.map((m) => ({
        sessionId: session.id,
        memberId: m.id,
        present: presentMemberIds.includes(m.id),
        reason: presentMemberIds.includes(m.id) ? null : "Absent",
      })),
    });
  }

  await auditLog({
    actorId: current.user.memberId,
    action: "CREATE",
    module: "ATTENDANCE",
    entityId: session.id,
    entityType: "AttendanceSession",
    description: `Recorded attendance for '${session.title}' — ${presentMemberIds.length}/${allMembers.length} present.`,
  });

  return created({ ...session, presentCount: presentMemberIds.length, totalCount: allMembers.length });
});

export { GET, POST };
