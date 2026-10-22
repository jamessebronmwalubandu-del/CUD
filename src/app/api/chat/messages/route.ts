import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { ok, created, badRequest, unauthorized, forbidden, withErrorHandler } from "@/lib/utils/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbAny = db as any;

export const runtime = "nodejs";

/**
 * GET /api/chat/messages?conversationId=xxx&before=ISO&limit=40
 * Fetch messages for a conversation (newest first, paginated by cursor).
 * Also marks messages as read by updating lastReadAt.
 */
const GET = withErrorHandler(async (req: NextRequest) => {
  const current = await getCurrentUser();
  if (!current || !current.user.memberId) return unauthorized();
  const memberId = current.user.memberId;

  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("conversationId");
  const before = searchParams.get("before"); // ISO timestamp cursor
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "40"), 100);

  if (!conversationId) return badRequest("conversationId is required.");

  // Verify membership
  const participant = await dbAny.conversationParticipant.findUnique({
    where: { conversationId_memberId: { conversationId, memberId } },
  });
  if (!participant) return forbidden("You are not a participant of this conversation.");

  const messages = await dbAny.message.findMany({
    where: {
      conversationId,
      ...(before ? { createdAt: { lt: new Date(before) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      sender: { select: { id: true, fullName: true, profilePhoto: true } },
    },
  });

  // Mark conversation as read — update lastReadAt to now
  await dbAny.conversationParticipant.update({
    where: { conversationId_memberId: { conversationId, memberId } },
    data: { lastReadAt: new Date() },
  });

  // Update conversation updatedAt to keep sorting fresh
  return ok({
    items: messages.reverse(), // return oldest → newest
    hasMore: messages.length === limit,
  });
});

/**
 * POST /api/chat/messages
 * Send a new message.
 *
 * Body: { conversationId, content, type? }
 * type: "TEXT" | "IMAGE" | "FILE" | "EMOJI"
 * For FILE/IMAGE: content = UploadThing URL, fileName and fileSize also provided
 */
const POST = withErrorHandler(async (req: NextRequest) => {
  const current = await getCurrentUser();
  if (!current || !current.user.memberId) return unauthorized();
  const memberId = current.user.memberId;

  const body = await req.json().catch(() => null);
  if (!body) return badRequest("Invalid body.");

  const { conversationId, content, type = "TEXT", fileName, fileSize } = body;

  if (!conversationId) return badRequest("conversationId is required.");
  if (!content?.trim()) return badRequest("content is required.");

  // Verify membership
  const participant = await dbAny.conversationParticipant.findUnique({
    where: { conversationId_memberId: { conversationId, memberId } },
  });
  if (!participant) return forbidden("You are not a participant of this conversation.");

  const message = await dbAny.message.create({
    data: {
      conversationId,
      senderId: memberId,
      type,
      content: content.trim(),
      fileName: fileName ?? null,
      fileSize: fileSize ?? null,
    },
    include: {
      sender: { select: { id: true, fullName: true, profilePhoto: true } },
    },
  });

  // Bump conversation updatedAt so it rises to top of list
  await dbAny.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return created(message);
});

export { GET, POST };
