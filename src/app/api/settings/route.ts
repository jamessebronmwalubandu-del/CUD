import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { authorize } from "@/lib/rbac/permissions";
import { auditLog } from "@/lib/services/audit";
import { ok, badRequest, unauthorized, notFound, withErrorHandler } from "@/lib/utils/api";

export const runtime = "nodejs";

const GET = withErrorHandler(async () => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "SETTING_MANAGE");

  const items = await db.systemSetting.findMany({ orderBy: { key: "asc" } });
  return ok({ items });
});

const PUT = withErrorHandler(async (req: NextRequest) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "SETTING_MANAGE");

  const body = await req.json().catch(() => null);
  if (!body?.key || typeof body.value !== "string") return badRequest("key and value are required.");

  const existing = await db.systemSetting.findUnique({ where: { key: body.key } });
  const updated = existing
    ? await db.systemSetting.update({
        where: { key: body.key },
        data: { value: body.value, description: body.description ?? undefined, updatedBy: current.user.memberId },
      })
    : await db.systemSetting.create({
        data: { key: body.key, value: body.value, description: body.description ?? null, updatedBy: current.user.memberId },
      });

  await auditLog({
    actorId: current.user.memberId,
    action: "UPDATE",
    module: "AUTH",
    entityId: updated.id,
    entityType: "SystemSetting",
    description: `Updated setting '${updated.key}' = '${updated.value}'.`,
  });

  return ok(updated);
});

export { GET, PUT };
