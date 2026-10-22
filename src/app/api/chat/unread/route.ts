import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { ok, unauthorized, withErrorHandler } from "@/lib/utils/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbAny = db as any;

export const runtime = "nodejs";

/**
 * GET /api/chat/unread
 * Returns total unread message count across all conversations.
 * Used by the nav badge.
 */
const GET = withErrorHandler(async (_req: NextRequest) => {
  const current = await getCurrentUser();
  if (!current || !current.user.memberId) return unauthorized();
  const memberId = current.user.memberId;

  const participations = await dbAny.conversationParticipant.findMany({
    where: { memberId },
    select: { conversationId: true, lastReadAt: true },
  });

  let total = 0;
  await Promise.all(
    participations.map(async (p) => {
      const count = await dbAny.message.count({
        where: {
          conversationId: p.conversationId,
          createdAt: { gt: p.lastReadAt },
          senderId: { not: memberId },
          deleted: false,
        },
      });
      total += count;
    })
  );

  return ok({ unread: total });
});

export { GET };
