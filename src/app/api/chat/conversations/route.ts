import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { ok, created, badRequest, unauthorized, withErrorHandler } from "@/lib/utils/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbAny = db as any;

export const runtime = "nodejs";

/**
 * GET /api/chat/conversations
 * List all conversations the current member is part of,
 * with the last message and unread count for each.
 */
const GET = withErrorHandler(async (_req: NextRequest) => {
  const current = await getCurrentUser();
  if (!current || !current.user.memberId) return unauthorized();
  const memberId = current.user.memberId;

  const participations = await dbAny.conversationParticipant.findMany({
    where: { memberId },
    include: {
      conversation: {
        include: {
          participants: {
            include: {
              member: {
                select: { id: true, fullName: true, profilePhoto: true, status: true },
              },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              sender: { select: { id: true, fullName: true } },
            },
          },
        },
      },
    },
    orderBy: { conversation: { updatedAt: "desc" } },
  });

  const items = await Promise.all(
    participations.map(async (p) => {
      const conv = p.conversation;
      const lastMessage = conv.messages[0] ?? null;

      // Count unread: messages after lastReadAt not sent by me
      const unreadCount = await dbAny.message.count({
        where: {
          conversationId: conv.id,
          createdAt: { gt: p.lastReadAt },
          senderId: { not: memberId },
          deleted: false,
        },
      });

      // For DIRECT conversations, derive the name/avatar from the other participant
      let displayName = conv.name;
      let displayAvatar = conv.avatarUrl;
      if (conv.type === "DIRECT") {
        const other = conv.participants.find((pp) => pp.memberId !== memberId);
        displayName = other?.member.fullName ?? "Unknown";
        displayAvatar = other?.member.profilePhoto ?? null;
      }

      return {
        id: conv.id,
        type: conv.type,
        name: displayName,
        avatarUrl: displayAvatar,
        participants: conv.participants.map((pp) => pp.member),
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              content: lastMessage.deleted ? "🚫 Message deleted" : lastMessage.content,
              type: lastMessage.type,
              senderId: lastMessage.senderId,
              senderName: lastMessage.sender.fullName,
              createdAt: lastMessage.createdAt,
            }
          : null,
        unreadCount,
        updatedAt: conv.updatedAt,
      };
    })
  );

  return ok({ items });
});

/**
 * POST /api/chat/conversations
 * Create a new conversation.
 *
 * Body:
 *  { type: "DIRECT", participantIds: ["memberId"] }
 *  { type: "GROUP",  name: "Group Name", participantIds: ["id1","id2",...] }
 */
const POST = withErrorHandler(async (req: NextRequest) => {
  const current = await getCurrentUser();
  if (!current || !current.user.memberId) return unauthorized();
  const memberId = current.user.memberId;

  const body = await req.json().catch(() => null);
  if (!body) return badRequest("Invalid body.");

  const { type = "DIRECT", name, participantIds } = body;

  if (!Array.isArray(participantIds) || participantIds.length === 0) {
    return badRequest("participantIds is required.");
  }

  const allParticipants: string[] = Array.from(new Set([memberId, ...participantIds]));

  // For DIRECT — find existing conversation between exactly these two members
  if (type === "DIRECT") {
    if (allParticipants.length !== 2) return badRequest("DIRECT conversations require exactly 2 participants.");
    const otherId = participantIds[0];

    const existing = await dbAny.conversation.findFirst({
      where: {
        type: "DIRECT",
        participants: { every: { memberId: { in: allParticipants } } },
        AND: [
          { participants: { some: { memberId } } },
          { participants: { some: { memberId: otherId } } },
        ],
      },
      include: { participants: { include: { member: { select: { id: true, fullName: true, profilePhoto: true } } } } },
    });

    if (existing) return ok(existing);
  }

  if (type === "GROUP" && !name?.trim()) return badRequest("Group name is required.");

  const conversation = await dbAny.conversation.create({
    data: {
      type,
      name: type === "GROUP" ? name.trim() : null,
      createdById: memberId,
      participants: {
        create: allParticipants.map((id) => ({ memberId: id })),
      },
    },
    include: {
      participants: {
        include: { member: { select: { id: true, fullName: true, profilePhoto: true } } },
      },
    },
  });

  return created(conversation);
});

export { GET, POST };
