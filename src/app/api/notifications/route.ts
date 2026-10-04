import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import {
  ok,
  badRequest,
  unauthorized,
  notFound,
  withErrorHandler,
} from "@/lib/utils/api";

export const runtime = "nodejs";

const GET = withErrorHandler(async (req: NextRequest) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  if (!current.user.memberId) return ok({ items: [], unreadCount: 0 });

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unreadOnly") === "true";

  const where: Record<string, unknown> = { memberId: current.user.memberId };
  if (unreadOnly) where.isRead = false;

  const [items, unreadCount] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.notification.count({
      where: { memberId: current.user.memberId, isRead: false },
    }),
  ]);

  return ok({ items, unreadCount });
});

// Mark all as read
const PATCH = withErrorHandler(async (req: NextRequest) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  if (!current.user.memberId) return ok({ updated: 0 });

  const body = await req.json().catch(() => ({}));
  if (body.all) {
    const result = await db.notification.updateMany({
      where: { memberId: current.user.memberId, isRead: false },
      data: { isRead: true },
    });
    return ok({ updated: result.count });
  }
  return badRequest("Provide { all: true } to mark all as read.");
});

export { GET, PATCH };
