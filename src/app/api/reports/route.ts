import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { authorize } from "@/lib/rbac/permissions";
import { ok, badRequest, unauthorized, withErrorHandler } from "@/lib/utils/api";

export const runtime = "nodejs";

/**
 * GET /api/reports?type=members|ministries|skills|attendance|events
 * Aggregated statistics for the dashboard & reports module.
 */
const GET = withErrorHandler(async (req: NextRequest) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "REPORT_VIEW");

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "overview";

  switch (type) {
    case "overview": {
      const [
        totalMembers,
        activeMembers,
        totalMinistries,
        totalSkills,
        pendingSkillRequests,
        totalSessions,
        upcomingEvents,
        totalDocuments,
        totalAnnouncements,
      ] = await Promise.all([
        db.member.count(),
        db.member.count({ where: { status: "ACTIVE" } }),
        db.ministry.count(),
        db.skill.count(),
        db.memberSkill.count({ where: { status: "PENDING" } }),
        db.attendanceSession.count(),
        db.event.count({ where: { status: "UPCOMING" } }),
        db.document.count(),
        db.announcement.count(),
      ]);
      return ok({
        totalMembers,
        activeMembers,
        totalMinistries,
        totalSkills,
        pendingSkillRequests,
        totalSessions,
        upcomingEvents,
        totalDocuments,
        totalAnnouncements,
      });
    }

    case "members": {
      const byFaculty = await db.member.groupBy({
        by: ["faculty"],
        _count: true,
      });
      const byGender = await db.member.groupBy({
        by: ["gender"],
        _count: true,
      });
      const byYearOfStudy = await db.member.groupBy({
        by: ["yearOfStudy"],
        _count: true,
        orderBy: { yearOfStudy: "asc" },
      });
      const byStatus = await db.member.groupBy({
        by: ["status"],
        _count: true,
      });
      return ok({
        byFaculty: byFaculty
          .map((g) => ({ ...g, _count: { _all: g._count as number } }))
          .sort((a, b) => b._count._all - a._count._all),
        byGender: byGender.map((g) => ({ ...g, _count: { _all: g._count as number } })),
        byYearOfStudy: byYearOfStudy.map((g) => ({ ...g, _count: { _all: g._count as number } })),
        byStatus: byStatus.map((g) => ({ ...g, _count: { _all: g._count as number } })),
      });
    }

    case "ministries": {
      const ministries = await db.ministry.findMany({
        include: {
          _count: { select: { members: true, documents: true, attendanceSessions: true } },
        },
        orderBy: { name: "asc" },
      });
      return ok({
        items: ministries.map((m) => ({
          id: m.id,
          name: m.name,
          color: m.color,
          memberCount: m._count.members,
          documentCount: m._count.documents,
          sessionCount: m._count.attendanceSessions,
        })),
      });
    }

    case "skills": {
      const byStatus = await db.memberSkill.groupBy({
        by: ["status"],
        _count: true,
      });
      const allSkills = await db.skill.findMany({
        include: { _count: { select: { members: true } } },
      });
      const topSkills = allSkills
        .sort((a, b) => b._count.members - a._count.members)
        .slice(0, 15)
        .map((s) => ({ id: s.id, name: s.name, count: s._count.members }));
      const byCategory = await db.skill.groupBy({
        by: ["category"],
        _count: true,
      });
      return ok({
        byStatus: byStatus.map((g) => ({ ...g, _count: { _all: g._count as number } })),
        topSkills,
        byCategory: byCategory
          .map((g) => ({ ...g, _count: { _all: g._count as number } }))
          .sort((a, b) => b._count._all - a._count._all),
      });
    }

    case "attendance": {
      // Last 12 sessions with present counts
      const sessions = await db.attendanceSession.findMany({
        orderBy: { date: "desc" },
        take: 30,
        include: {
          _count: { select: { records: true } },
          records: { where: { present: true }, select: { id: true } },
        },
      });
      const items = sessions.map((s) => ({
        id: s.id,
        title: s.title,
        type: s.type,
        date: s.date,
        present: s.records.length,
        total: s._count.records,
        rate: s._count.records > 0 ? (s.records.length / s._count.records) * 100 : 0,
      }));

      const byType = await db.attendanceSession.groupBy({
        by: ["type"],
        _count: true,
      });

      // Individual attendance rates
      const membersWithRates = await db.member.findMany({
        where: { status: "ACTIVE" },
        select: {
          id: true,
          fullName: true,
          regNumber: true,
          attendance: { select: { present: true } },
        },
      });
      const attendanceByMember = membersWithRates.map((m) => {
        const total = m.attendance.length;
        const present = m.attendance.filter((a) => a.present).length;
        return {
          id: m.id,
          fullName: m.fullName,
          regNumber: m.regNumber,
          totalSessions: total,
          presentCount: present,
          rate: total > 0 ? (present / total) * 100 : 0,
        };
      });

      return ok({
        items,
        byType: byType.map((g) => ({ ...g, _count: { _all: g._count as number } })),
        attendanceByMember,
      });
    }

    case "events": {
      const byStatus = await db.event.groupBy({
        by: ["status"],
        _count: true,
      });
      const upcoming = await db.event.findMany({
        where: { status: "UPCOMING" },
        orderBy: { startDate: "asc" },
        take: 10,
        include: { _count: { select: { registrations: true } } },
      });
      return ok({
        byStatus: byStatus.map((g) => ({ ...g, _count: { _all: g._count as number } })),
        upcoming: upcoming.map((e) => ({
          id: e.id,
          title: e.title,
          startDate: e.startDate,
          location: e.location,
          capacity: e.capacity,
          registrations: e._count.registrations,
        })),
      });
    }

    default:
      return badRequest(`Unknown report type: ${type}`);
  }
});

export { GET };
