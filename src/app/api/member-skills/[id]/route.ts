import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { authorize } from "@/lib/rbac/permissions";
import { auditLog } from "@/lib/services/audit";
import {
  ok,
  badRequest,
  unauthorized,
  notFound,
  withErrorHandler,
} from "@/lib/utils/api";

export const runtime = "nodejs";

// PATCH /api/member-skills/[id] — approve / reject / update proficiency
const PATCH = withErrorHandler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();

  const { id } = await ctx.params;
  const existing = await db.memberSkill.findUnique({
    where: { id },
    include: { skill: true, member: true },
  });
  if (!existing) return notFound("Skill request not found.");

  const body = await req.json().catch(() => null);
  if (!body) return badRequest("Invalid body.");

  // If status is changing → require SKILL_APPROVE
  if (body.status && body.status !== existing.status) {
    authorize(current.user.role, "SKILL_APPROVE");
  }
  // If only proficiency updating → owner or admin
  if (!body.status && body.proficiency && existing.memberId !== current.user.memberId) {
    authorize(current.user.role, "SKILL_APPROVE");
  }

  const data: Record<string, unknown> = {};
  if (body.status) {
    data.status = body.status;
    if (body.status === "APPROVED" || body.status === "REJECTED") {
      data.reviewedAt = new Date();
      data.reviewedBy = current.user.memberId;
      if (typeof body.reviewerNote === "string") data.reviewerNote = body.reviewerNote;
    }
  }
  if (body.proficiency) data.proficiency = body.proficiency;

  await db.memberSkill.update({
    where: { id },
    data,
  });

  const updated = await db.memberSkill.findUnique({
    where: { id },
    include: { skill: true, member: true },
  });

  await auditLog({
    actorId: current.user.memberId,
    action: body.status === "APPROVED" ? "APPROVE" : body.status === "REJECTED" ? "REJECT" : "UPDATE",
    module: "SKILLS",
    entityId: id,
    entityType: "MemberSkill",
    description:
      body.status === "APPROVED"
        ? `Approved ${existing.member.fullName}'s '${existing.skill.name}' skill.`
        : body.status === "REJECTED"
        ? `Rejected ${existing.member.fullName}'s '${existing.skill.name}' skill.`
        : `Updated ${existing.member.fullName}'s '${existing.skill.name}' skill.`,
  });

  return ok(updated);
});

// DELETE /api/member-skills/[id] — owner or admin
const DELETE = withErrorHandler(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();

  const { id } = await ctx.params;
  const existing = await db.memberSkill.findUnique({ where: { id } });
  if (!existing) return notFound("Skill request not found.");

  if (existing.memberId !== current.user.memberId) {
    authorize(current.user.role, "SKILL_APPROVE");
  }

  await db.memberSkill.delete({ where: { id } });

  await auditLog({
    actorId: current.user.memberId,
    action: "DELETE",
    module: "SKILLS",
    entityId: id,
    entityType: "MemberSkill",
    description: `Removed skill request.`,
  });

  return ok({ success: true });
});

export { PATCH, DELETE };
