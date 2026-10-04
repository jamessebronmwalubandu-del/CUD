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

const GET = withErrorHandler(async (req: NextRequest) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "EVENT_VIEW");

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (from || to) {
    where.startDate = {};
    if (from) (where.startDate as Record<string, unknown>).gte = new Date(from);
    if (to) (where.startDate as Record<string, unknown>).lte = new Date(to);
  }

  const items = await db.event.findMany({
    where,
    orderBy: { startDate: "asc" },
    include: {
      organizer: true,
      _count: { select: { registrations: true } },
    },
  });

  return ok({ items });
});

const POST = withErrorHandler(async (req: NextRequest) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "EVENT_MANAGE");

  const body = await req.json().catch(() => null);
  if (!body?.title || !body?.startDate) return badRequest("title and startDate are required.");

  const event = await db.event.create({
    data: {
      title: body.title,
      description: body.description || null,
      location: body.location || null,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : null,
      organizerId: current.user.memberId,
      ministryId: body.ministryId || null,
      capacity: body.capacity ? Number(body.capacity) : null,
      status: body.status || "UPCOMING",
    },
    include: { organizer: true },
  });

  await auditLog({
    actorId: current.user.memberId,
    action: "CREATE",
    module: "EVENTS",
    entityId: event.id,
    entityType: "Event",
    description: `Created event '${event.title}'.`,
  });

  return created(event);
});

export { GET, POST };
