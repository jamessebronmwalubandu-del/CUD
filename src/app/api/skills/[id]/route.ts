import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { authorize, AuthorizationError } from "@/lib/rbac/permissions";
import { auditLog } from "@/lib/services/audit";
import {
  ok,
  badRequest,
  unauthorized,
  notFound,
  withErrorHandler,
} from "@/lib/utils/api";

export const runtime = "nodejs";

// PUT /api/skills/[id]
const PUT = withErrorHandler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "SKILL_MANAGE_CATALOG");

  const { id } = await ctx.params;
  const existing = await db.skill.findUnique({ where: { id } });
  if (!existing) return notFound("Skill not found.");

  const body = await req.json().catch(() => null);
  if (!body) return badRequest("Invalid body.");

  const updated = await db.skill.update({
    where: { id },
    data: {
      name: body.name ?? existing.name,
      category: body.category ?? existing.category,
      description: body.description ?? existing.description,
    },
  });

  await auditLog({
    actorId: current.user.memberId,
    action: "UPDATE",
    module: "SKILLS",
    entityId: id,
    entityType: "Skill",
    description: `Updated skill '${updated.name}'.`,
  });

  return ok(updated);
});

// DELETE /api/skills/[id]
const DELETE = withErrorHandler(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "SKILL_MANAGE_CATALOG");

  const { id } = await ctx.params;
  const existing = await db.skill.findUnique({ where: { id } });
  if (!existing) return notFound("Skill not found.");

  await db.skill.delete({ where: { id } });

  await auditLog({
    actorId: current.user.memberId,
    action: "DELETE",
    module: "SKILLS",
    entityId: id,
    entityType: "Skill",
    description: `Deleted skill '${existing.name}'.`,
  });

  return ok({ success: true });
});

export { PUT, DELETE };
