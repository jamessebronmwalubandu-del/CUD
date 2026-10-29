import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { ok, badRequest, unauthorized, forbidden, withErrorHandler } from "@/lib/utils/api";

export const runtime = "nodejs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbAny = db as any;

/**
 * POST /api/chat/reactions
 * Toggle a reaction emoji on a message.
 * If the member already reacted with the same emoji → remove it (toggle off).
 * Body: { messageId, emoji }
 */
const POST = withErrorHandler(async (req: NextRequest) => {
  const current = await getCurrentUser();
  if (!current || !current.user.memberId) return unauthorized();
  const memberId = current.user.memberId;

  const body = await req.json().catch(() => null);
  if (!body?.messageId || !body?.emoji) return badRequest("messageId and emoji required.");

  const { messageId, emoji } = body;

  // Verify the message exists and member is in the conversation
  const message = await dbAny.message.findUnique({
    where: { id: messageId },
    select: { conversationId: true },
  });
  if (!message) return badRequest("Message not found.");

  const participant = await dbAny.conversationParticipant.findUnique({
    where: { conversationId_memberId: { conversationId: message.conversationId, memberId } },
  });
  if (!participant) return forbidden("Not a participant.");

  // Toggle: check if reaction already exists
  const existing = await dbAny.messageReaction.findUnique({
    where: { messageId_memberId_emoji: { messageId, memberId, emoji } },
  });

  if (existing) {
    await dbAny.messageReaction.delete({ where: { id: existing.id } });
    return ok({ action: "removed", emoji });
  } else {
    await dbAny.messageReaction.create({ data: { messageId, memberId, emoji } });
    return ok({ action: "added", emoji });
  }
});

export { POST };
