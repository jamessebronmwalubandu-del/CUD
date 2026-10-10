import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { ok, unauthorized, withErrorHandler } from "@/lib/utils/api";

export const runtime = "nodejs";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();

  const { searchParams } = new URL(req.url);
  let course = searchParams.get("course");

  // If no course specified, fetch logged-in member's course
  if (!course && current.user.memberId) {
    const currentMember = await db.member.findUnique({
      where: { id: current.user.memberId },
      select: { course: true },
    });
    course = currentMember?.course || null;
  }

  if (!course) {
    return ok({ items: [], targetCourse: null });
  }

  // Find classmates studying the exact same course
  let mates = await db.member.findMany({
    where: {
      course: { equals: course, mode: "insensitive" },
      id: current.user.memberId ? { not: current.user.memberId } : undefined,
      status: "ACTIVE",
    },
    select: {
      id: true,
      fullName: true,
      regNumber: true,
      course: true,
      yearOfStudy: true,
      phoneNumber: true,
      email: true,
      profilePhoto: true,
      hostel: true,
    },
    take: 20,
    orderBy: { yearOfStudy: "asc" },
  });

  let isFallback = false;

  // Fallback: if no classmates found in exact same course, bring other fellowship members in same faculty or general active members
  if (mates.length === 0) {
    isFallback = true;
    mates = await db.member.findMany({
      where: {
        id: current.user.memberId ? { not: current.user.memberId } : undefined,
        status: "ACTIVE",
      },
      select: {
        id: true,
        fullName: true,
        regNumber: true,
        course: true,
        yearOfStudy: true,
        phoneNumber: true,
        email: true,
        profilePhoto: true,
        hostel: true,
      },
      take: 10,
    });
  }

  return ok({ items: mates, targetCourse: course, isFallback });
});
