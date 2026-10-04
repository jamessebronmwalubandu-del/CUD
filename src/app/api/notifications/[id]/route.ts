import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { ok, unauthorized, notFound, withErrorHandler } from "@/lib/utils/api";

export const runtime = "nodejs";

const PATCH = withErrorHandler(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();

  const { id } = await ctx.params;
  const existing = await db.notification.findUnique({ where: { id } });
  if (!existing) return notFound("Notification not found.");
  if (existing.memberId !== current.user.memberId) return notFound("Notification not found.");

  const updated = await db.notification.update({
    where: { id },
    data: { isRead: true },
  });
  return ok(updated);
});

const DELETE = withErrorHandler(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();

  const { id } = await ctx.params;
  const existing = await db.notification.findUnique({ where: { id } });
  if (!existing) return notFound("Notification not found.");
  if (existing.memberId !== current.user.memberId) return notFound("Notification not found.");

  await db.notification.delete({ where: { id } });
  return ok({ success: true });
});

export { PATCH, DELETE };
