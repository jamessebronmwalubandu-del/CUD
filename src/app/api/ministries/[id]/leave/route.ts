import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { auditLog } from "@/lib/services/audit";
import { ok, unauthorized, notFound, withErrorHandler } from "@/lib/utils/api";
import { cache } from "@/lib/utils/cache";

export const runtime = "nodejs";

export const POST = withErrorHandler(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const current = await getCurrentUser();
  if (!current || !current.user.memberId) return unauthorized();

  const { id } = await ctx.params;
  const ministry = await db.ministry.findUnique({ where: { id } });
  if (!ministry) return notFound("Ministry not found.");

  const memberId = current.user.memberId;
  await db.ministryMember.deleteMany({
    where: { ministryId: id, memberId },
  });

  await auditLog({
    actorId: memberId,
    action: "DELETE",
    module: "MINISTRIES",
    entityId: id,
    entityType: "MinistryMember",
    description: `Member left ministry '${ministry.name}'.`,
  });

  cache.invalidate("ministries_list");
  cache.invalidate("dashboard_summary");

  return ok({ success: true, message: `Left ${ministry.name}` });
});
