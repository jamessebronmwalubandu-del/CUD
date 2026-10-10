import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { auditLog } from "@/lib/services/audit";
import {
  ok,
  badRequest,
  unauthorized,
  notFound,
  withErrorHandler,
} from "@/lib/utils/api";

export const runtime = "nodejs";

const PATCH = withErrorHandler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();

  const isAdmin = current.user.role === "SUPER_ADMIN" || current.user.role === "ADMIN";
  if (!isAdmin) return unauthorized();

  const { id } = await ctx.params;
  const existing = await db.feedback.findUnique({ where: { id } });
  if (!existing) return notFound("Feedback not found.");

  const body = await req.json().catch(() => null);
  if (!body) return badRequest("Invalid body.");

  const updated = await db.feedback.update({
    where: { id },
    data: {
      status: body.status ?? existing.status,
      adminResponse: body.adminResponse !== undefined ? body.adminResponse : existing.adminResponse,
    },
    include: { member: true },
  });

  await auditLog({
    actorId: current.user.memberId,
    action: "UPDATE",
    module: "FEEDBACK",
    entityId: id,
    entityType: "Feedback",
    description: `Updated feedback status to '${updated.status}'.`,
  });

  return ok(updated);
});

const DELETE = withErrorHandler(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();

  const { id } = await ctx.params;
  const existing = await db.feedback.findUnique({ where: { id } });
  if (!existing) return notFound("Feedback not found.");

  const isAdmin = current.user.role === "SUPER_ADMIN" || current.user.role === "ADMIN";
  const isAuthor = existing.memberId === current.user.memberId;
  if (!isAdmin && !isAuthor) return unauthorized();

  await db.feedback.delete({ where: { id } });

  await auditLog({
    actorId: current.user.memberId,
    action: "DELETE",
    module: "FEEDBACK",
    entityId: id,
    entityType: "Feedback",
    description: `Deleted feedback '${existing.subject}'.`,
  });

  return ok({ success: true });
});

export { PATCH, DELETE };
