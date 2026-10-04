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
  authorize(current.user.role, "ANNOUNCEMENT_VIEW");

  const { searchParams } = new URL(req.url);
  const audience = searchParams.get("audience");
  const priority = searchParams.get("priority");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(50, parseInt(searchParams.get("pageSize") ?? "20", 10));

  const where: Record<string, unknown> = {};
  if (audience) where.audience = audience;
  if (priority) where.priority = priority;

  const [total, items] = await Promise.all([
    db.announcement.count({ where }),
    db.announcement.findMany({
      where,
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        author: true,
        ministry: true,
        _count: { select: { comments: true } },
      },
    }),
  ]);

  return ok({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
});

const POST = withErrorHandler(async (req: NextRequest) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "ANNOUNCEMENT_CREATE");

  const body = await req.json().catch(() => null);
  if (!body?.title || !body?.content) return badRequest("title and content are required.");

  const announcement = await db.announcement.create({
    data: {
      title: body.title,
      content: body.content,
      audience: body.audience || "ALL",
      audienceRef: body.audienceRef || null,
      priority: body.priority || "NORMAL",
      authorId: current.user.memberId,
      ministryId: body.ministryId || null,
      pinned: !!body.pinned,
      smsSent: false,
      smsRecipients: 0,
    },
    include: { author: true, ministry: true },
  });

  // Create notifications for all members
  const members = await db.member.findMany({ where: { status: "ACTIVE" } });
  await db.notification.createMany({
    data: members.map((m) => ({
      memberId: m.id,
      title: `New announcement: ${announcement.title}`,
      message: announcement.content.slice(0, 120),
      type: "ANNOUNCEMENT",
      link: `/announcements/${announcement.id}`,
    })),
  });

  await auditLog({
    actorId: current.user.memberId,
    action: "CREATE",
    module: "ANNOUNCEMENTS",
    entityId: announcement.id,
    entityType: "Announcement",
    description: `Created announcement '${announcement.title}'.`,
  });

  return created(announcement);
});

export { GET, POST };
