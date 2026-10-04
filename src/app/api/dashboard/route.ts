import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { authorize } from "@/lib/rbac/permissions";
import { ok, unauthorized, withErrorHandler } from "@/lib/utils/api";

export const runtime = "nodejs";

/**
 * GET /api/dashboard
 * Aggregated data for the dashboard home: KPIs + recent activity + charts.
 */
const GET = withErrorHandler(async (_req: NextRequest) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();

  const [
    totalMembers,
    activeMembers,
    totalMinistries,
    totalSkills,
    pendingSkillRequests,
    upcomingEvents,
    recentAnnouncements,
    attendanceRates,
    membersByFaculty,
    membersByGender,
    membersByYearOfStudy,
    recentSessions,
  ] = await Promise.all([
    db.member.count(),
    db.member.count({ where: { status: "ACTIVE" } }),
    db.ministry.count(),
    db.skill.count(),
    db.memberSkill.count({ where: { status: "PENDING" } }),
    db.event.findMany({
      where: { startDate: { gte: new Date() }, status: "UPCOMING" },
      orderBy: { startDate: "asc" },
      take: 5,
      include: { _count: { select: { registrations: true } } },
    }),
    db.announcement.findMany({
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 5,
      include: { author: true, _count: { select: { comments: true } } },
    }),
    db.attendanceRecord.groupBy({
      by: ["present"],
      _count: true,
    }),
    db.member.groupBy({
      by: ["faculty"],
      _count: true,
    }),
    db.member.groupBy({
      by: ["gender"],
      _count: true,
    }),
    db.member.groupBy({
      by: ["yearOfStudy"],
      _count: true,
      orderBy: { yearOfStudy: "asc" },
    }),
    db.attendanceSession.findMany({
      orderBy: { date: "desc" },
      take: 6,
      include: {
        _count: { select: { records: true } },
        records: {
          where: { present: true },
          select: { id: true },
        },
      },
    }),
  ]);

  const totalRecords = attendanceRates.reduce((sum, r) => sum + (r._count as number), 0);
  const presentRecords = (attendanceRates.find((r) => r.present)?._count as number) ?? 0;
  const attendanceRate = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0;

  return ok({
    kpis: {
      totalMembers,
      activeMembers,
      totalMinistries,
      totalSkills,
      pendingSkillRequests,
      upcomingEventsCount: upcomingEvents.length,
      attendanceRate,
    },
    upcomingEvents,
    recentAnnouncements,
    membersByFaculty: membersByFaculty
      .map((m) => ({ faculty: m.faculty, _count: { _all: m._count as number } }))
      .sort((a, b) => b._count._all - a._count._all)
      .slice(0, 8),
    membersByGender: membersByGender.map((m) => ({ gender: m.gender, _count: { _all: m._count as number } })),
    membersByYearOfStudy: membersByYearOfStudy.map((m) => ({ yearOfStudy: m.yearOfStudy, _count: { _all: m._count as number } })),
    recentAttendance: recentSessions.map((s) => ({
      id: s.id,
      title: s.title,
      type: s.type,
      date: s.date,
      present: s.records.length,
      total: s._count.records,
    })),
  });
});

export { GET };
