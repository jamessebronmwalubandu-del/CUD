import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { ok, unauthorized, withErrorHandler } from "@/lib/utils/api";

export const runtime = "nodejs";

/**
 * GET /api/members/course-mates
 *
 * Returns tiered "People you may know" suggestions for the logged-in member.
 *
 * Priority order:
 *  1. COURSEMATES  — same course (exact, case-insensitive)
 *  2. ROOMMATES    — same hostel (only if hostel is set)
 *  3. FACULTY      — same faculty / college
 *
 * Each result carries a `relationTag` so the UI can label the connection.
 * Never falls back to "all members" — if nothing matches the section is hidden.
 */

const SELECT = {
  id: true,
  fullName: true,
  regNumber: true,
  course: true,
  faculty: true,
  yearOfStudy: true,
  phoneNumber: true,
  email: true,
  profilePhoto: true,
  hostel: true,
} as const;

export const GET = withErrorHandler(async (_req: NextRequest) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();

  const memberId = current.user.memberId;
  if (!memberId) return ok({ items: [], matchType: null });

  // Fetch the current member's profile fields
  const me = await db.member.findUnique({
    where: { id: memberId },
    select: { course: true, faculty: true, hostel: true },
  });

  if (!me) return ok({ items: [], matchType: null });

  const exclude = { id: { not: memberId } };
  const activeOnly = { status: "ACTIVE" as const };

  // ── 1. Coursemates ────────────────────────────────────────────────────────
  if (me.course) {
    const coursemates = await db.member.findMany({
      where: {
        ...exclude,
        ...activeOnly,
        course: { equals: me.course, mode: "insensitive" },
      },
      select: SELECT,
      take: 12,
      orderBy: { yearOfStudy: "asc" },
    });

    if (coursemates.length > 0) {
      return ok({
        items: coursemates.map((m) => ({ ...m, relationTag: "coursemate" })),
        matchType: "course",
        matchValue: me.course,
      });
    }
  }

  // ── 2. Roommates (same hostel) ────────────────────────────────────────────
  if (me.hostel) {
    const roommates = await db.member.findMany({
      where: {
        ...exclude,
        ...activeOnly,
        hostel: { equals: me.hostel, mode: "insensitive" },
      },
      select: SELECT,
      take: 12,
      orderBy: { fullName: "asc" },
    });

    if (roommates.length > 0) {
      return ok({
        items: roommates.map((m) => ({ ...m, relationTag: "roommate" })),
        matchType: "hostel",
        matchValue: me.hostel,
      });
    }
  }

  // ── 3. Faculty peers ──────────────────────────────────────────────────────
  if (me.faculty) {
    const facultyPeers = await db.member.findMany({
      where: {
        ...exclude,
        ...activeOnly,
        faculty: { equals: me.faculty, mode: "insensitive" },
      },
      select: SELECT,
      take: 12,
      orderBy: { yearOfStudy: "asc" },
    });

    if (facultyPeers.length > 0) {
      return ok({
        items: facultyPeers.map((m) => ({ ...m, relationTag: "faculty" })),
        matchType: "faculty",
        matchValue: me.faculty,
      });
    }
  }

  // ── Nothing matched ───────────────────────────────────────────────────────
  return ok({ items: [], matchType: null, matchValue: null });
});
