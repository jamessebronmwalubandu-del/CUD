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
  authorize(current.user.role, "EVENT_VIEW");

  const { id } = await ctx.params;
  const event = await db.event.findUnique({
    where: { id },
    include: {
      organizer: true,
      registrations: { include: { member: true }, orderBy: { registeredAt: "asc" } },
    },
  });
  if (!event) return notFound("Event not found.");
  return ok(event);
});

const PUT = withErrorHandler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "EVENT_MANAGE");

  const { id } = await ctx.params;
  const existing = await db.event.findUnique({ where: { id } });
  if (!existing) return notFound("Event not found.");

  const body = await req.json().catch(() => null);
  if (!body) return badRequest("Invalid body.");

  const updated = await db.event.update({
    where: { id },
    data: {
      title: body.title ?? existing.title,
      description: body.description ?? existing.description,
      location: body.location ?? existing.location,
      startDate: body.startDate ? new Date(body.startDate) : existing.startDate,
      endDate: body.endDate !== undefined ? (body.endDate ? new Date(body.endDate) : null) : existing.endDate,
      capacity: body.capacity !== undefined ? (body.capacity ? Number(body.capacity) : null) : existing.capacity,
      status: body.status ?? existing.status,
    },
  });

  await auditLog({
    actorId: current.user.memberId,
    action: "UPDATE",
    module: "EVENTS",
    entityId: id,
    entityType: "Event",
    description: `Updated event '${updated.title}'.`,
  });

  return ok(updated);
});

const DELETE = withErrorHandler(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "EVENT_MANAGE");

  const { id } = await ctx.params;
  const existing = await db.event.findUnique({ where: { id } });
  if (!existing) return notFound("Event not found.");

  await db.event.delete({ where: { id } });

  await auditLog({
    actorId: current.user.memberId,
    action: "DELETE",
    module: "EVENTS",
    entityId: id,
    entityType: "Event",
    description: `Deleted event '${existing.title}'.`,
  });

  return ok({ success: true });
});

// POST — register current user for this event
const POST = withErrorHandler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  if (!current.user.memberId) return badRequest("Your account is not linked to a member profile.");

  const { id } = await ctx.params;
  const event = await db.event.findUnique({ where: { id } });
  if (!event) return notFound("Event not found.");

  const existing = await db.eventRegistration.findUnique({
    where: { eventId_memberId: { eventId: id, memberId: current.user.memberId } },
  });
  if (existing) {
    // Unregister
    await db.eventRegistration.delete({ where: { id: existing.id } });
    await auditLog({
      actorId: current.user.memberId,
      action: "DELETE",
      module: "EVENTS",
      entityId: id,
      entityType: "EventRegistration",
      description: `Cancelled registration for '${event.title}'.`,
    });
    return ok({ registered: false });
  }

  if (event.capacity) {
    const count = await db.eventRegistration.count({ where: { eventId: id } });
    if (count >= event.capacity) return badRequest("Event is at full capacity.");
  }

  await db.eventRegistration.create({
    data: { eventId: id, memberId: current.user.memberId },
  });
  await auditLog({
    actorId: current.user.memberId,
    action: "CREATE",
    module: "EVENTS",
    entityId: id,
    entityType: "EventRegistration",
    description: `Registered for '${event.title}'.`,
  });

  return ok({ registered: true });
});

export { GET, PUT, DELETE, POST };
