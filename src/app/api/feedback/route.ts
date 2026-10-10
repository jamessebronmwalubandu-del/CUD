import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { auditLog } from "@/lib/services/audit";
import {
  ok,
  created,
  badRequest,
  unauthorized,
  withErrorHandler,
} from "@/lib/utils/api";

export const runtime = "nodejs";

const GET = withErrorHandler(async (req: NextRequest) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();

  const isAdmin = current.user.role === "SUPER_ADMIN" || current.user.role === "ADMIN";
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (!isAdmin && current.user.memberId) {
    where.memberId = current.user.memberId;
  }
  if (category) where.category = category;
  if (status) where.status = status;

  const feedbacks = await db.feedback.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      member: {
        select: {
          id: true,
          fullName: true,
          course: true,
          yearOfStudy: true,
          profilePhoto: true,
        },
      },
    },
  });

  return ok({ items: feedbacks });
});

const POST = withErrorHandler(async (req: NextRequest) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body?.subject || !body?.content) {
    return badRequest("Subject and content are required.");
  }

  const isAnonymous = !!body.isAnonymous;
  const memberId = isAnonymous ? null : current.user.memberId;

  const feedback = await db.feedback.create({
    data: {
      subject: String(body.subject).trim(),
      content: String(body.content).trim(),
      category: body.category || "GENERAL",
      isAnonymous,
      memberId,
      status: "PENDING",
    },
    include: {
      member: {
        select: {
          id: true,
          fullName: true,
          course: true,
          yearOfStudy: true,
        },
      },
    },
  });

  await auditLog({
    actorId: current.user.memberId,
    action: "CREATE",
    module: "FEEDBACK",
    entityId: feedback.id,
    entityType: "Feedback",
    description: `Submitted feedback '${feedback.subject}'.`,
  });

  return created(feedback);
});

export { GET, POST };
