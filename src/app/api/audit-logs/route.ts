import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { authorize } from "@/lib/rbac/permissions";
import { ok, badRequest, unauthorized, withErrorHandler } from "@/lib/utils/api";

export const runtime = "nodejs";

const GET = withErrorHandler(async (req: NextRequest) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "AUDIT_VIEW");

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(100, parseInt(searchParams.get("pageSize") ?? "50", 10));
  const moduleFilter = searchParams.get("module");
  const actionFilter = searchParams.get("action");
  const actorId = searchParams.get("actorId");

  const where: Record<string, unknown> = {};
  if (moduleFilter) where.module = moduleFilter;
  if (actionFilter) where.action = actionFilter;
  if (actorId) where.actorId = actorId;

  const [total, items] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { actor: { select: { id: true, fullName: true, regNumber: true } } },
    }),
  ]);

  return ok({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
});

export { GET };
