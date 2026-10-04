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
  conflict,
  withErrorHandler,
} from "@/lib/utils/api";

export const runtime = "nodejs";

// GET /api/member-skills — list (with optional memberId / status filter)
const GET = withErrorHandler(async (req: NextRequest) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "SKILL_VIEW");

  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (memberId) where.memberId = memberId;
  if (status) where.status = status;

  const items = await db.memberSkill.findMany({
    where,
    include: { skill: true, member: true },
    orderBy: { requestedAt: "desc" },
  });

  return ok({ items });
});

// POST /api/member-skills — member requests a skill
const POST = withErrorHandler(async (req: NextRequest) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "SKILL_REQUEST");

  const body = await req.json().catch(() => null);
  if (!body?.skillId) return badRequest("skillId is required.");

  const targetMemberId = body.memberId ?? current.user.memberId;
  if (!targetMemberId) return badRequest("memberId is required (your account is not linked to a member).");

  // Only super admin/admin can request on behalf of another member
  if (body.memberId && body.memberId !== current.user.memberId) {
    authorize(current.user.role, "SKILL_APPROVE");
  }

  const skill = await db.skill.findUnique({ where: { id: body.skillId } });
  if (!skill) return notFound("Skill not found.");

  const existing = await db.memberSkill.findUnique({
    where: { memberId_skillId: { memberId: targetMemberId, skillId: body.skillId } },
  });
  if (existing) return conflict("Skill already requested.");

  const ms = await db.memberSkill.create({
    data: {
      memberId: targetMemberId,
      skillId: body.skillId,
      status: "PENDING",
      proficiency: body.proficiency || null,
    },
    include: { skill: true },
  });

  await auditLog({
    actorId: current.user.memberId,
    action: "CREATE",
    module: "SKILLS",
    entityId: ms.id,
    entityType: "MemberSkill",
    description: `Requested skill '${skill.name}'.`,
  });

  return created(ms);
});

export { GET, POST };
