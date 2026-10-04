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

/**
 * Mock SMS Broadcast endpoint — emulates Africa's Talking API.
 * In production, the actual HTTP call to https://api.africastalking.com/version1/messaging/bulk
 * would be made here. In this environment we log and persist the would-be recipients.
 */

interface SmsRecipient {
  memberId: string;
  phoneNumber: string;
  name: string;
  status: "SENT" | "FAILED";
  messageId?: string;
  error?: string;
}

const POST = withErrorHandler(async (req: NextRequest) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "SMS_BROADCAST");

  const body = await req.json().catch(() => null);
  if (!body?.message) return badRequest("message is required.");

  const message = String(body.message).slice(0, 920); // AT supports up to 920 chars
  const audience = body.audience || "ALL"; // ALL | MINISTRY | COURSE | FACULTY | HOSTEL | CUSTOM
  const audienceRef = body.audienceRef || null; // ministryId / course / faculty / hostel string
  const memberIds: string[] = Array.isArray(body.memberIds) ? body.memberIds : [];
  const announcementId = body.announcementId || null;
  const senderId = (await db.systemSetting.findUnique({ where: { key: "SMS_SENDER_ID" } }))?.value || "CASFETA";

  // Build recipient list
  let members: { id: string; fullName: string; phoneNumber: string }[] = [];
  if (audience === "CUSTOM" && memberIds.length > 0) {
    members = await db.member.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, fullName: true, phoneNumber: true },
    });
  } else if (audience === "MINISTRY" && audienceRef) {
    members = await db.member.findMany({
      where: { ministries: { some: { ministryId: audienceRef } } },
      select: { id: true, fullName: true, phoneNumber: true },
    });
  } else if (audience === "COURSE" && audienceRef) {
    members = await db.member.findMany({
      where: { course: audienceRef },
      select: { id: true, fullName: true, phoneNumber: true },
    });
  } else if (audience === "FACULTY" && audienceRef) {
    members = await db.member.findMany({
      where: { faculty: audienceRef },
      select: { id: true, fullName: true, phoneNumber: true },
    });
  } else if (audience === "HOSTEL" && audienceRef) {
    members = await db.member.findMany({
      where: { hostel: audienceRef },
      select: { id: true, fullName: true, phoneNumber: true },
    });
  } else {
    members = await db.member.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, fullName: true, phoneNumber: true },
    });
  }

  // Simulate sending — in production, call Africa's Talking bulk SMS API.
  // We assume 100% delivery success for the simulation and log details for audit.
  const recipients: SmsRecipient[] = members.map((m) => ({
    memberId: m.id,
    phoneNumber: m.phoneNumber,
    name: m.fullName,
    status: "SENT",
    messageId: `AT-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
  }));

  const sentCount = recipients.filter((r) => r.status === "SENT").length;

  // Persist on announcement if announcementId provided
  if (announcementId) {
    await db.announcement.update({
      where: { id: announcementId },
      data: { smsSent: true, smsRecipients: sentCount },
    });
  }

  await auditLog({
    actorId: current.user.memberId,
    action: "CREATE",
    module: "ANNOUNCEMENTS",
    entityId: announcementId,
    entityType: "SMS_BROADCAST",
    description: `Broadcast SMS to ${sentCount} recipients (audience=${audience}).`,
    metadata: {
      audience,
      audienceRef,
      senderId,
      sampleMessage: message.slice(0, 80),
      recipients: recipients.slice(0, 50),
      totalRecipients: recipients.length,
    },
  });

  return created({
    success: true,
    senderId,
    audience,
    audienceRef,
    messagePreview: message.slice(0, 100),
    totalRecipients: recipients.length,
    sent: sentCount,
    failed: recipients.length - sentCount,
    recipients: recipients.slice(0, 100), // first 100 for UI display
    note:
      "SMS broadcast simulated via Africa's Talking API signature. Wire AT_API_KEY and AT_USERNAME in production to enable real delivery.",
  });
});

export { POST };
