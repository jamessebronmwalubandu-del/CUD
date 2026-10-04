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
  authorize(current.user.role, "ANNOUNCEMENT_VIEW");

  const { id } = await ctx.params;
  const announcement = await db.announcement.findUnique({
    where: { id },
    include: {
      author: true,
      ministry: true,
      comments: {
        include: { member: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!announcement) return notFound("Announcement not found.");
  return ok(announcement);
});

const PUT = withErrorHandler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "ANNOUNCEMENT_CREATE");

  const { id } = await ctx.params;
  const existing = await db.announcement.findUnique({ where: { id } });
  if (!existing) return notFound("Announcement not found.");

  const body = await req.json().catch(() => null);
  if (!body) return badRequest("Invalid body.");

  const updated = await db.announcement.update({
    where: { id },
    data: {
      title: body.title ?? existing.title,
      content: body.content ?? existing.content,
      audience: body.audience ?? existing.audience,
      audienceRef: body.audienceRef ?? existing.audienceRef,
      priority: body.priority ?? existing.priority,
      pinned: body.pinned ?? existing.pinned,
    },
  });

  await auditLog({
    actorId: current.user.memberId,
    action: "UPDATE",
    module: "ANNOUNCEMENTS",
    entityId: id,
    entityType: "Announcement",
    description: `Updated announcement '${updated.title}'.`,
  });

  return ok(updated);
});

const DELETE = withErrorHandler(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "ANNOUNCEMENT_DELETE");

  const { id } = await ctx.params;
  const existing = await db.announcement.findUnique({ where: { id } });
  if (!existing) return notFound("Announcement not found.");

  await db.announcement.delete({ where: { id } });

  await auditLog({
    actorId: current.user.memberId,
    action: "DELETE",
    module: "ANNOUNCEMENTS",
    entityId: id,
    entityType: "Announcement",
    description: `Deleted announcement '${existing.title}'.`,
  });

  return ok({ success: true });
});

export { GET, PUT, DELETE };
