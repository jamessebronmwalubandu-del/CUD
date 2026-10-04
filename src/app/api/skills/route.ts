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

// GET /api/skills — list all skills (with optional category filter)
const GET = withErrorHandler(async (req: NextRequest) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "SKILL_VIEW");

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category")?.trim();
  const q = searchParams.get("q")?.trim();

  const where: Record<string, unknown> = {};
  if (category) where.category = category;
  if (q) where.name = { contains: q };

  const skills = await db.skill.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      _count: { select: { members: true } },
    },
  });

  return ok({ items: skills });
});

// POST /api/skills — create a new skill (catalog)
const POST = withErrorHandler(async (req: NextRequest) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "SKILL_MANAGE_CATALOG");

  const body = await req.json().catch(() => null);
  if (!body?.name) return badRequest("Skill name is required.");

  const existing = await db.skill.findUnique({ where: { name: body.name } });
  if (existing) return conflict("Skill already exists.");

  const skill = await db.skill.create({
    data: {
      name: body.name,
      category: body.category || null,
      description: body.description || null,
    },
  });

  await auditLog({
    actorId: current.user.memberId,
    action: "CREATE",
    module: "SKILLS",
    entityId: skill.id,
    entityType: "Skill",
    description: `Created skill '${skill.name}'.`,
  });

  return created(skill);
});

export { GET, POST };
