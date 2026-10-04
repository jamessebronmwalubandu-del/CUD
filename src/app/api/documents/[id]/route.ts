import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { authorize, can } from "@/lib/rbac/permissions";
import { auditLog } from "@/lib/services/audit";
import {
  ok,
  badRequest,
  unauthorized,
  notFound,
  forbidden,
  withErrorHandler,
} from "@/lib/utils/api";

export const runtime = "nodejs";

const GET = withErrorHandler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "DOCUMENT_VIEW");

  const { id } = await ctx.params;
  const document = await db.document.findUnique({
    where: { id },
    include: { ministry: true, uploadedBy: true },
  });
  if (!document) return notFound("Document not found.");

  // Permission check
  if (document.accessLevel === "ADMIN" && !can(current.user.role, "DOCUMENT_UPLOAD" as never)) {
    return forbidden("You do not have access to this document.");
  }
  if (document.accessLevel === "MINISTRY" && document.ministryId) {
    const inMinistry = await db.ministryMember.findUnique({
      where: {
        ministryId_memberId: {
          ministryId: document.ministryId,
          memberId: current.user.memberId ?? "",
        },
      },
    });
    if (!inMinistry && !can(current.user.role, "DOCUMENT_UPLOAD" as never)) {
      return forbidden("You do not have access to this ministry document.");
    }
  }

  // Increment download counter if it's a download intent (default)
  const isDownload = new URL(req.url).searchParams.get("download") !== "false";
  if (isDownload) {
    await db.document.update({
      where: { id },
      data: { downloads: { increment: 1 } },
    });
  }

  return ok(document);
});

const DELETE = withErrorHandler(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "DOCUMENT_DELETE");

  const { id } = await ctx.params;
  const existing = await db.document.findUnique({ where: { id } });
  if (!existing) return notFound("Document not found.");

  await db.document.delete({ where: { id } });

  await auditLog({
    actorId: current.user.memberId,
    action: "DELETE",
    module: "DOCUMENTS",
    entityId: id,
    entityType: "Document",
    description: `Deleted document '${existing.title}'.`,
  });

  return ok({ success: true });
});

export { GET, DELETE };
