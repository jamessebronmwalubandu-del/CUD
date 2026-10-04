import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import {
  ok,
  created,
  badRequest,
  unauthorized,
  notFound,
  withErrorHandler,
} from "@/lib/utils/api";

export const runtime = "nodejs";

const GET = withErrorHandler(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();

  const { id } = await ctx.params;
  const announcement = await db.announcement.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!announcement) return notFound("Announcement not found.");

  const comments = await db.comment.findMany({
    where: { announcementId: id },
    include: { member: true },
    orderBy: { createdAt: "asc" },
  });

  return ok({ items: comments });
});

const POST = withErrorHandler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  if (!current.user.memberId) return badRequest("Your account is not linked to a member profile.");

  const { id } = await ctx.params;
  const announcement = await db.announcement.findUnique({ where: { id } });
  if (!announcement) return notFound("Announcement not found.");

  const body = await req.json().catch(() => null);
  if (!body?.content?.trim()) return badRequest("content is required.");

  const comment = await db.comment.create({
    data: {
      announcementId: id,
      memberId: current.user.memberId,
      content: body.content.trim(),
    },
    include: { member: true },
  });

  return created(comment);
});

export { GET, POST };
