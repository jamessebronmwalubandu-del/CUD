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

// GET /api/members/search — fast multi-field search
const GET = withErrorHandler(async (req: NextRequest) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "MEMBER_VIEW");

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20", 10));

  if (!q) return ok({ items: [] });

  const items = await db.member.findMany({
    where: {
      OR: [
        { fullName: { contains: q } },
        { regNumber: { contains: q } },
        { phoneNumber: { contains: q } },
        { email: { contains: q } },
        { faculty: { contains: q } },
        { department: { contains: q } },
        { course: { contains: q } },
        { hostel: { contains: q } },
        { homeRegion: { contains: q } },
        { skills: { some: { skill: { name: { contains: q } } } } },
        { ministries: { some: { ministry: { name: { contains: q } } } } },
      ],
    },
    take: limit,
    include: {
      skills: { include: { skill: true } },
      ministries: { include: { ministry: true } },
    },
    orderBy: { fullName: "asc" },
  });

  return ok({ items });
});

export { GET };
