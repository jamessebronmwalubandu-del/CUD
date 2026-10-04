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
  forbidden,
  notFound,
  conflict,
  serverError,
  withErrorHandler,
} from "@/lib/utils/api";

export const runtime = "nodejs";

// GET /api/members — list with optional filters + pagination
const GET = withErrorHandler(async (req: NextRequest) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "MEMBER_VIEW");

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(100, parseInt(searchParams.get("pageSize") ?? "20", 10));
  const q = searchParams.get("q")?.trim();
  const faculty = searchParams.get("faculty")?.trim();
  const department = searchParams.get("department")?.trim();
  const course = searchParams.get("course")?.trim();
  const yearOfStudy = searchParams.get("yearOfStudy")?.trim();
  const gender = searchParams.get("gender")?.trim();
  const ministryId = searchParams.get("ministryId")?.trim();
  const skillId = searchParams.get("skillId")?.trim();
  const status = searchParams.get("status")?.trim();

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { fullName: { contains: q } },
      { regNumber: { contains: q } },
      { phoneNumber: { contains: q } },
      { email: { contains: q } },
    ];
  }
  if (faculty) where.faculty = { contains: faculty };
  if (department) where.department = { contains: department };
  if (course) where.course = { contains: course };
  if (yearOfStudy) where.yearOfStudy = yearOfStudy;
  if (gender) where.gender = gender;
  if (status) where.status = status;
  if (ministryId) where.ministries = { some: { ministryId } };
  if (skillId) where.skills = { some: { skillId } };

  const [total, items] = await Promise.all([
    db.member.count({ where }),
    db.member.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        skills: { include: { skill: true } },
        ministries: { include: { ministry: true } },
      },
    }),
  ]);

  return ok({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
});

// POST /api/members — create
const POST = withErrorHandler(async (req: NextRequest) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "MEMBER_CREATE");

  const body = await req.json().catch(() => null);
  if (!body) return badRequest("Invalid body.");

  const required = ["fullName", "regNumber", "phoneNumber", "gender", "faculty", "department", "course", "yearOfStudy"];
  for (const f of required) {
    if (!body[f]) return badRequest(`Field '${f}' is required.`);
  }

  const existingReg = await db.member.findUnique({ where: { regNumber: body.regNumber } });
  if (existingReg) return conflict("Registration number already exists.");

  if (body.email) {
    const existingEmail = await db.member.findUnique({ where: { email: body.email } });
    if (existingEmail) return conflict("Email already exists.");
  }

  const member = await db.member.create({
    data: {
      fullName: body.fullName,
      regNumber: body.regNumber,
      phoneNumber: body.phoneNumber,
      email: body.email || null,
      gender: body.gender,
      faculty: body.faculty,
      department: body.department,
      course: body.course,
      yearOfStudy: body.yearOfStudy,
      hostel: body.hostel || null,
      homeRegion: body.homeRegion || null,
      emergencyContact: body.emergencyContact || null,
      biography: body.biography || null,
      profilePhoto: body.profilePhoto || null,
      status: body.status || "ACTIVE",
    },
  });

  await auditLog({
    actorId: current.user.memberId,
    action: "CREATE",
    module: "MEMBERS",
    entityId: member.id,
    entityType: "Member",
    description: `Created member ${member.fullName} (${member.regNumber}).`,
    metadata: { regNumber: member.regNumber },
  });

  return created(member);
});

export { GET, POST };
