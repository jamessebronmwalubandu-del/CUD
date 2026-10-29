import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { ok, badRequest, unauthorized, forbidden, withErrorHandler } from "@/lib/utils/api";

export const runtime = "nodejs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbAny = db as any;

/**
 * PATCH /api/chat/conversations/[id]
 * Update group name, description, or avatarUrl.
 * Only participants can update.
 */
const PATCH = withErrorHandler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const current = await getCurrentUser();
  if (!current || !current.user.memberId) return unauthorized();
  const memberId = current.user.memberId;
  const { id } = await ctx.params;

  const participant = await dbAny.conversationParticipant.findUnique({
    where: { conversationId_memberId: { conversationId: id, memberId } },
  });
  if (!participant) return forbidden("Not a participant.");

  const body = await req.json().catch(() => null);
  if (!body) return badRequest("Invalid body.");

  const { name, description, avatarUrl } = body;
  const data: Record<string, string> = {};
  if (name !== undefined) data.name = String(name).trim();
  if (description !== undefined) data.description = String(description).trim();
  if (avatarUrl !== undefined) data.avatarUrl = String(avatarUrl);

  const updated = await dbAny.conversation.update({
    where: { id },
    data,
    include: {
      participants: {
        include: { member: { select: { id: true, fullName: true, profilePhoto: true } } },
      },
    },
  });

  return ok(updated);
});

/**
 * GET /api/chat/conversations/[id]
 * Get full conversation details including participants.
 */
const GET = withErrorHandler(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const current = await getCurrentUser();
  if (!current || !current.user.memberId) return unauthorized();
  const memberId = current.user.memberId;
  const { id } = await ctx.params;

  const participant = await dbAny.conversationParticipant.findUnique({
    where: { conversationId_memberId: { conversationId: id, memberId } },
  });
  if (!participant) return forbidden("Not a participant.");

  const conv = await dbAny.conversation.findUnique({
    where: { id },
    include: {
      participants: {
        include: { member: { select: { id: true, fullName: true, profilePhoto: true, course: true, faculty: true } } },
      },
    },
  });

  return ok(conv);
});

export { GET, PATCH };
