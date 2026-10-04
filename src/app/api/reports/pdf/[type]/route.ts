import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { authorize } from "@/lib/rbac/permissions";
import { PdfReportBuilder, type PdfKpiCard, type PdfTableColumn } from "@/lib/pdf/builder";
import {
  buildBarChart,
  buildPieChart,
  buildLineChart,
} from "@/lib/pdf/charts";
import { formatDate, LABELS } from "@/lib/utils/client";

export const runtime = "nodejs";

const REPORT_TITLES: Record<string, { en: string; sw: string }> = {
  overview: { en: "Chapter Overview Report", sw: "Ripoti ya Muhtasari wa Tawi" },
  members: { en: "Membership Demographics Report", sw: "Ripoti ya Demografia ya Wanachama" },
  ministries: { en: "Ministries Report", sw: "Ripoti ya Wizara" },
  skills: { en: "Skills & Talents Report", sw: "Ripoti ya Ujuzi na Vipaji" },
  attendance: { en: "Attendance Analytics Report", sw: "Ripoti ya Takwimu za Mahudhurio" },
  events: { en: "Events Report", sw: "Ripoti ya Matukio" },
};

const SUBTITLES: Record<string, { en: string; sw: string }> = {
  overview: {
    en: "Comprehensive snapshot of fellowship health, engagement, and activity.",
    sw: "Picha kamili ya afya ya ushirika, ushiriki na shughuli.",
  },
  members: {
    en: "Demographic breakdown of registered members by faculty, gender, year, and status.",
    sw: "Mgawanyo wa demografia ya wanachama waliosajiliwa kwa kitivo, jinsia, mwaka na hali.",
  },
  ministries: {
    en: "Detailed comparison of ministry membership, documents, and activity.",
    sw: "Ulinganisho wa kina wa uanachama wa wizara, nyaraka na shughuli.",
  },
  skills: {
    en: "Catalogue distribution, approval pipeline, and member proficiency overview.",
    sw: "Uenezi wa orodha, mchoro wa idhini na muhtasari wa uwezo wa wanachama.",
  },
  attendance: {
    en: "Session-by-session attendance trends and individual member rates.",
    sw: "Mwelekeo wa mahudhurio ya kikao kwa kikao na viwango vya kibinafsi.",
  },
  events: {
    en: "Event lifecycle, capacity utilisation, and registration summary.",
    sw: "Mzunguko wa tukio, matumizi ya uwezo na muhtasari wa usajili.",
  },
};

const GET = async (
  req: NextRequest,
  ctx: { params: Promise<{ type: string }> }
) => {
  try {
    const current = await getCurrentUser();
    if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    authorize(current.user.role, "REPORT_VIEW");

    const { type } = await ctx.params;
    const validTypes = ["overview", "members", "ministries", "skills", "attendance", "events"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }

    const url = new URL(req.url);
    const locale = (url.searchParams.get("locale") as "en" | "sw") || "en";

    const title = REPORT_TITLES[type][locale];
    const subtitle = SUBTITLES[type][locale];

    const builder = new PdfReportBuilder({
      title,
      subtitle,
      locale,
      organization: "CASFETA — CUD Chapter",
      author: current.user.name,
    });

    // Cover page with summary stats
    const overviewStats = await getOverviewStats();
    builder.coverPage([
      { label: locale === "sw" ? "Wanachama" : "Members", value: overviewStats.totalMembers },
      { label: locale === "sw" ? "Wizara" : "Ministries", value: overviewStats.totalMinistries },
      { label: locale === "sw" ? "Ujuzi" : "Skills", value: overviewStats.totalSkills },
      { label: locale === "sw" ? "Vikao" : "Sessions", value: overviewStats.totalSessions },
      { label: locale === "sw" ? "Matukio Yajayo" : "Upcoming Events", value: overviewStats.upcomingEvents },
      { label: locale === "sw" ? "Nyaraka" : "Documents", value: overviewStats.totalDocuments },
    ]);

    // Executive Summary
    builder.sectionHeading(
      locale === "sw" ? "Muhtasari Mkuu" : "Executive Summary",
      locale === "sw"
        ? "Muhtasari wa hali ya jumla ya tawi."
        : "Summary of the chapter's overall state."
    );
    builder.paragraph(buildExecutiveSummary(type, overviewStats, locale));

    // Type-specific sections
    switch (type) {
      case "overview":
        await buildOverviewReport(builder, locale);
        break;
      case "members":
        await buildMembersReport(builder, locale);
        break;
      case "ministries":
        await buildMinistriesReport(builder, locale);
        break;
      case "skills":
        await buildSkillsReport(builder, locale);
        break;
      case "attendance":
        await buildAttendanceReport(builder, locale);
        break;
      case "events":
        await buildEventsReport(builder, locale);
        break;
    }

    const buffer = await builder.end();
    const filename = `cud-${type}-report-${new Date().toISOString().slice(0, 10)}.pdf`;

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (err) {
    console.error("[PDF API] error:", err);
    const msg = err instanceof Error ? err.message : "Failed to generate PDF";
    if (msg === "UNAUTHENTICATED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
};

export { GET };

// ─────────────────────────────── Data fetchers ───────────────────────────────

async function getOverviewStats() {
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
    db.event.count({ where: { status: "UPCOMING", startDate: { gte: new Date() } } }),
    db.document.count(),
    db.announcement.count(),
  ]);
  return {
    totalMembers,
    activeMembers,
    totalMinistries,
    totalSkills,
    pendingSkillRequests,
    totalSessions,
    upcomingEvents,
    totalDocuments,
    totalAnnouncements,
  };
}

function buildExecutiveSummary(
  type: string,
  stats: Awaited<ReturnType<typeof getOverviewStats>>,
  locale: "en" | "sw"
): string {
  const en: Record<string, string> = {
    overview: `This report provides a comprehensive overview of CASFETA CUD Chapter as of ${formatDate(new Date(), { year: "numeric", month: "long", day: "numeric" })}. The chapter currently comprises ${stats.totalMembers} registered members (${stats.activeMembers} active) across ${stats.totalMinistries} ministries. The skills catalogue contains ${stats.totalSkills} tracked skills, with ${stats.pendingSkillRequests} requests pending leader review. A total of ${stats.totalSessions} attendance sessions have been recorded, ${stats.upcomingEvents} events are upcoming, and ${stats.totalDocuments} documents are stored in the repository. ${stats.totalAnnouncements} announcements have been published to date.`,
    members: `This report analyses the demographic composition of ${stats.totalMembers} registered members of CASFETA CUD Chapter as of ${formatDate(new Date(), { year: "numeric", month: "long", day: "numeric" })}. The breakdown covers faculty, department, gender, year of study, and current member status. ${stats.activeMembers} members (${Math.round((stats.activeMembers / Math.max(stats.totalMembers, 1)) * 100)}%) are currently active, providing leadership and ministry continuity. This data is intended to inform outreach, mentorship, and strategic planning decisions.`,
    ministries: `This report compares ${stats.totalMinistries} active ministries within CASFETA CUD Chapter. Each ministry's membership size, document repository, and attendance sessions are analysed to identify engagement patterns and resource needs. The chapter's distributed ministry model ensures broad member participation and leadership development.`,
    skills: `This report presents the skills landscape of CASFETA CUD Chapter, covering ${stats.totalSkills} catalogue entries. ${stats.pendingSkillRequests} member skill requests are currently pending leader approval. The report highlights the most-requested skills, approval pipeline health, and proficiency distribution — equipping leaders to match members with suitable ministry roles and training opportunities.`,
    attendance: `This report analyses ${stats.totalSessions} recorded attendance sessions, evaluating present rates by session type and individual member. Regular attendance tracking enables the chapter to identify engaged members, follow up with absentees, and maintain accurate records for leadership accountability.`,
    events: `This report summarises event activity within CASFETA CUD Chapter. ${stats.upcomingEvents} events are currently scheduled. The report covers event status distribution, capacity utilisation, and registration trends — supporting better planning of conferences, worship nights, Bible study kickoffs, and evangelism outreach.`,
  };
  const sw: Record<string, string> = {
    overview: `Ripoti hii inatoa muhtasari kamili wa Tawi la CUD la CASFETA kufikia ${formatDate(new Date(), { year: "numeric", month: "long", day: "numeric" })}. Tawi lina wanachama ${stats.totalMembers} waliyosajiliwa (${stats.activeMembers} amilifu) katika wizara ${stats.totalMinistries}. Orodha ya ujuzi ina ujuzi ${stats.totalSkills}, ukiwa na maombi ${stats.pendingSkillRequests} yanayosubiri ukaguzi wa viongozi. Jumla ya vikao ${stats.totalSessions} vimekadiriwa, matukio ${stats.upcomingEvents} yajayo, na nyaraka ${stats.totalDocuments} zimehifadhiwa. Matangazo ${stats.totalAnnouncements} yametumwa hadi sasa.`,
    members: `Ripoti hii inachambua muundo wa demografia ya wanachama ${stats.totalMembers} waliosajiliwa wa Tawi la CUD la CASFETA kufikia ${formatDate(new Date(), { year: "numeric", month: "long", day: "numeric" })}. Mgawanyo unajumuisha kitivo, idara, jinsia, mwaka wa masomo na hali ya sasa ya mwanachama. Wanachama ${stats.activeMembers} (${Math.round((stats.activeMembers / Math.max(stats.totalMembers, 1)) * 100)}%) wamo amilifu, wakihakikisha uongozi na uendelezaji wa wizara. Data hii inalenga kuongoza uamuzi wa ukombozi, urafiki na upangaji wa kimkakati.`,
    ministries: `Ripoti hii inalinganisha wizara ${stats.totalMinistries} amilifu ndani ya Tawi la CUD la CASFETA. Uanachama, hifadhi ya nyaraka na vikao vya kila wizara vimechambuliwa kubaini mifumo ya ushiriki na mahitaji ya rasilimali. Mfumo wa wizara uliogatuliwa huhakikisha ushiriki mpana wa wanachama na uendelezaji wa uongozi.`,
    skills: `Ripoti hii inawasilisha mandhari ya ujuzi wa Tawi la CUD la CASFETA, ikijumuisha ingizo ${stats.totalSkills} la orodha. Maombi ${stats.pendingSkillRequests} ya ujuzi ya wanachama yanapasubiri idhini ya viongozi. Ripoti inaonyesha ujuzi ulioombwa zaidi, afya ya mchoro wa idhini na uenezi wa uwezo — ikiwawezesha viongozi kuunganisha wanachama na wadhifa na mafunzo yafaayo.`,
    attendance: `Ripoti hii inachambua vikao ${stats.totalSessions} vimekadiriwa, ikipima viwango vya mahudhurio kwa aina ya kikao na mwanachama binafsi. Ufuatiliaji wa kawaida wa mahudhurio umwezesha tawi kutambua wanachama washiriki, kufuatilia wasiopo, na kudumisha rekodi sahihi kwa ajili ya uwajibikaji wa uongozi.`,
    events: `Ripoti hii inahitimisha shughuli za matukio ndani ya Tawi la CUD la CASFETA. Matukio ${stats.upcomingEvents} yamepangwa kwa sasa. Ripoti inashughulikia uenezi wa hali ya tukio, matumizi ya uwezo na mifumo ya usajili — ikiunga mkono upangaji bora wa makongamano, usiku wa ibada, uzinduzi wa somo la Biblia na injili.`,
  };
  return (locale === "sw" ? sw : en)[type];
}

// ─────────────────────────────── Per-type report builders ───────────────────────────────

async function buildOverviewReport(b: PdfReportBuilder, locale: "en" | "sw") {
  const stats = await getOverviewStats();
  // KPI grid
  b.sectionHeading(
    locale === "sw" ? "Vipimo Muhimu" : "Key Metrics",
    locale === "sw" ? "Vipimo vya utendaji vya tawi." : "Chapter performance indicators."
  );
  const kpis: PdfKpiCard[] = [
    { label: locale === "sw" ? "Wanachama Wote" : "Total Members", value: stats.totalMembers, subtext: `${stats.activeMembers} ${locale === "sw" ? "amilifu" : "active"}` },
    { label: locale === "sw" ? "Wizara" : "Ministries", value: stats.totalMinistries, subtext: locale === "sw" ? "Timu amilifu" : "Active teams" },
    { label: locale === "sw" ? "Ujuzi" : "Skills", value: stats.totalSkills, subtext: `${stats.pendingSkillRequests} ${locale === "sw" ? "yanasubiri" : "pending"}` },
    { label: locale === "sw" ? "Matukio Yajayo" : "Upcoming Events", value: stats.upcomingEvents, subtext: locale === "sw" ? "Yamepangwa" : "Scheduled" },
    { label: locale === "sw" ? "Vikao" : "Sessions", value: stats.totalSessions, subtext: locale === "sw" ? "Vimekadiriwa" : "Recorded" },
    { label: locale === "sw" ? "Nyaraka" : "Documents", value: stats.totalDocuments, subtext: locale === "sw" ? "Zimehifadhiwa" : "Stored" },
    { label: locale === "sw" ? "Matangazo" : "Announcements", value: stats.totalAnnouncements, subtext: locale === "sw" ? "Yametumwa" : "Published" },
    { label: locale === "sw" ? "Ujuzi Unasubiri" : "Pending Skills", value: stats.pendingSkillRequests, subtext: locale === "sw" ? "Kwa ukaguzi" : "For review" },
  ];
  b.kpiGrid(kpis);

  // Gender chart
  const byGender = await db.member.groupBy({ by: ["gender"], _count: true });
  b.sectionHeading(locale === "sw" ? "Uenezi wa Jinsia" : "Gender Distribution");
  const genderChart = await buildPieChart(
    byGender.map((g) => LABELS.gender[g.gender] ?? g.gender),
    byGender.map((g) => g._count as number),
    locale === "sw" ? "Wanachama kwa Jinsia" : "Members by Gender"
  );
  b.chart(genderChart, locale === "sw" ? "Mgawanyo wa wanachama kwa jinsia." : "Member breakdown by gender.");

  // Faculty chart
  const byFaculty = await db.member.groupBy({ by: ["faculty"], _count: true });
  const sortedFaculty = byFaculty
    .map((f) => ({ faculty: f.faculty, count: f._count as number }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  b.sectionHeading(locale === "sw" ? "Wanachama kwa Kitivo" : "Members by Faculty");
  const facultyChart = await buildBarChart(
    sortedFaculty.map((f) => f.faculty.replace(/^School of /, "").slice(0, 25)),
    sortedFaculty.map((f) => f.count),
    locale === "sw" ? "Vitivo 8 vya Juu" : "Top 8 Faculties"
  );
  b.chart(facultyChart, locale === "sw" ? "Vitivo 8 vinavyoongoza kwa idadi ya wanachama." : "Top 8 faculties by member count.");
}

async function buildMembersReport(b: PdfReportBuilder, locale: "en" | "sw") {
  // KPIs
  const stats = await getOverviewStats();
  b.sectionHeading(locale === "sw" ? "Vipimo Muhimu" : "Key Metrics");
  b.kpiGrid([
    { label: locale === "sw" ? "Wanachama Wote" : "Total Members", value: stats.totalMembers },
    { label: locale === "sw" ? "Wanachama Amilifu" : "Active Members", value: stats.activeMembers },
    { label: locale === "sw" ? "Wamehitimu" : "Graduated", value: await db.member.count({ where: { status: "GRADUATED" } }) },
    { label: locale === "sw" ? "Haiamilifu" : "Inactive", value: await db.member.count({ where: { status: "INACTIVE" } }) },
  ]);

  // By Faculty chart
  const byFaculty = await db.member.groupBy({ by: ["faculty"], _count: true });
  const sortedFaculty = byFaculty.map((f) => ({ faculty: f.faculty, count: f._count as number })).sort((a, b) => b.count - a.count);
  b.sectionHeading(locale === "sw" ? "Wanachama kwa Kitivo" : "Members by Faculty");
  const chart1 = await buildBarChart(
    sortedFaculty.map((f) => f.faculty.replace(/^School of /, "").slice(0, 25)),
    sortedFaculty.map((f) => f.count),
    locale === "sw" ? "Kwa Kitivo" : "By Faculty",
    true
  );
  b.chart(chart1);

  // By Year of Study
  const byYear = await db.member.groupBy({ by: ["yearOfStudy"], _count: true, orderBy: { yearOfStudy: "asc" } });
  b.sectionHeading(locale === "sw" ? "Wanachama kwa Mwaka wa Masomo" : "Members by Year of Study");
  const chart2 = await buildBarChart(
    byYear.map((y) => LABELS.year[y.yearOfStudy] ?? y.yearOfStudy),
    byYear.map((y) => y._count as number),
    locale === "sw" ? "Kwa Mwaka" : "By Year"
  );
  b.chart(chart2);

  // By Status pie
  const byStatus = await db.member.groupBy({ by: ["status"], _count: true });
  b.sectionHeading(locale === "sw" ? "Hali ya Wanachama" : "Member Status");
  const chart3 = await buildPieChart(
    byStatus.map((s) => LABELS.status[s.status] ?? s.status),
    byStatus.map((s) => s._count as number),
    locale === "sw" ? "Kwa Hali" : "By Status"
  );
  b.chart(chart3);

  // Detailed table
  b.pageBreak();
  b.sectionHeading(
    locale === "sw" ? "Orodha Kamili ya Wanachama" : "Complete Member Roster",
    locale === "sw" ? "Jumla ya wanachama wote waliosajiliwa." : "All registered members."
  );
  const members = await db.member.findMany({
    orderBy: { fullName: "asc" },
    take: 200,
  });
  const cols: PdfTableColumn[] = [
    { header: locale === "sw" ? "Jina" : "Name", key: "fullName", width: 2 },
    { header: locale === "sw" ? "Namba" : "Reg. No.", key: "regNumber", width: 1.3 },
    { header: locale === "sw" ? "Kozi" : "Course", key: "course", width: 2.5, formatter: (v) => (v as string)?.slice(0, 30) ?? "" },
    { header: locale === "sw" ? "Mwaka" : "Year", key: "yearOfStudy", width: 0.7, align: "center", formatter: (v) => LABELS.year[v as string] ?? "" },
    { header: locale === "sw" ? "Hali" : "Status", key: "status", width: 1, align: "center", formatter: (v) => LABELS.status[v as string] ?? "" },
  ];
  b.table(cols, members as unknown as Record<string, unknown>[]);
}

async function buildMinistriesReport(b: PdfReportBuilder, locale: "en" | "sw") {
  const ministries = await db.ministry.findMany({
    include: {
      leader: true,
      _count: { select: { members: true, documents: true, attendanceSessions: true } },
    },
    orderBy: { name: "asc" },
  });

  b.sectionHeading(locale === "sw" ? "Ulinganisho wa Wizara" : "Ministry Comparison");
  const chart = await buildBarChart(
    ministries.map((m) => m.name.slice(0, 20)),
    ministries.map((m) => m._count.members),
    locale === "sw" ? "Idadi ya Wanachama kwa Wizara" : "Member Count by Ministry"
  );
  b.chart(chart);

  b.sectionHeading(
    locale === "sw" ? "Maelezo ya Wizara" : "Ministry Details",
    locale === "sw" ? "Kiongozi, msaidizi na idadi ya wanachama." : "Leader, assistant, and member counts."
  );
  const cols: PdfTableColumn[] = [
    { header: locale === "sw" ? "Wizara" : "Ministry", key: "name", width: 2 },
    { header: locale === "sw" ? "Kiongozi" : "Leader", key: "leaderName", width: 2, formatter: (_v, row) => (row as { leader?: { fullName: string } }).leader?.fullName ?? "—" },
    { header: locale === "sw" ? "Wanachama" : "Members", key: "memberCount", width: 1, align: "center", formatter: (_v, row) => String((row as { _count: { members: number } })._count.members) },
    { header: locale === "sw" ? "Nyaraka" : "Documents", key: "docCount", width: 1, align: "center", formatter: (_v, row) => String((row as { _count: { documents: number } })._count.documents) },
    { header: locale === "sw" ? "Vikao" : "Sessions", key: "sessionCount", width: 1, align: "center", formatter: (_v, row) => String((row as { _count: { attendanceSessions: number } })._count.attendanceSessions) },
  ];
  b.table(cols, ministries as unknown as Record<string, unknown>[]);
}

async function buildSkillsReport(b: PdfReportBuilder, locale: "en" | "sw") {
  // By Status pie
  const byStatus = await db.memberSkill.groupBy({ by: ["status"], _count: true });
  b.sectionHeading(locale === "sw" ? "Ujuzi kwa Hali" : "Skills by Status");
  const chart1 = await buildPieChart(
    byStatus.map((s) => LABELS.skillStatus[s.status] ?? s.status),
    byStatus.map((s) => s._count as number),
    locale === "sw" ? "Kwa Hali" : "By Status"
  );
  b.chart(chart1);

  // Top 15 skills
  const allSkills = await db.skill.findMany({
    include: { _count: { select: { members: true } } },
  });
  const topSkills = allSkills
    .map((s) => ({ name: s.name, count: s._count.members, category: s.category ?? "—" }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  b.sectionHeading(
    locale === "sw" ? "Ujuzi 15 wa Juu" : "Top 15 Skills",
    locale === "sw" ? "Ujuzi ulioombwa zaidi na wanachama." : "Most requested skills by members."
  );
  const chart2 = await buildBarChart(
    topSkills.map((s) => s.name.slice(0, 20)),
    topSkills.map((s) => s.count),
    locale === "sw" ? "Ujuzi wa Juu" : "Top Skills",
    true
  );
  b.chart(chart2);

  // Detailed table
  b.sectionHeading(locale === "sw" ? "Orodha ya Ujuzi" : "Skills Catalogue");
  const cols: PdfTableColumn[] = [
    { header: locale === "sw" ? "Jina" : "Name", key: "name", width: 2.5 },
    { header: locale === "sw" ? "Kategoria" : "Category", key: "category", width: 1.5 },
    { header: locale === "sw" ? "Wanachama" : "Members", key: "count", width: 1, align: "right" },
  ];
  b.table(cols, topSkills as unknown as Record<string, unknown>[]);
}

async function buildAttendanceReport(b: PdfReportBuilder, locale: "en" | "sw") {
  // Recent sessions
  const sessions = await db.attendanceSession.findMany({
    orderBy: { date: "desc" },
    take: 15,
    include: {
      _count: { select: { records: true } },
      records: { where: { present: true }, select: { id: true } },
    },
  });

  b.sectionHeading(
    locale === "sw" ? "Mwelekeo wa Mahudhurio" : "Attendance Trend",
    locale === "sw" ? "Vikao 15 vya hivi karibuni." : "Last 15 sessions."
  );
  const chart = await buildLineChart(
    sessions.slice().reverse().map((s) => formatDate(s.date, { month: "short", day: "numeric" })),
    [
      { label: locale === "sw" ? "Waliopo" : "Present", data: sessions.slice().reverse().map((s) => s.records.length) },
    ],
    locale === "sw" ? "Mahudhurio kwa Kikao" : "Attendance per Session"
  );
  b.chart(chart);

  // Sessions table
  b.sectionHeading(locale === "sw" ? "Vikao vya Hivi Karibuni" : "Recent Sessions");
  const cols: PdfTableColumn[] = [
    { header: locale === "sw" ? "Kichwa" : "Title", key: "title", width: 3, formatter: (v) => (v as string).slice(0, 35) },
    { header: locale === "sw" ? "Aina" : "Type", key: "type", width: 1.5, formatter: (v) => LABELS.attendanceType[v as string] ?? (v as string) },
    { header: locale === "sw" ? "Tarehe" : "Date", key: "date", width: 1.2, align: "center", formatter: (v) => formatDate(v as string, { month: "short", day: "numeric", year: "2-digit" }) },
    { header: locale === "sw" ? "Waliopo" : "Present", key: "present", width: 0.8, align: "right", formatter: (_v, row) => String((row as { records: unknown[] }).records.length) },
    { header: locale === "sw" ? "Jumla" : "Total", key: "total", width: 0.8, align: "right", formatter: (_v, row) => String((row as { _count: { records: number } })._count.records) },
    { header: "%", key: "rate", width: 0.7, align: "right", formatter: (_v, row) => {
      const r = row as { records: unknown[]; _count: { records: number } };
      return r._count.records > 0 ? `${Math.round((r.records.length / r._count.records) * 100)}%` : "—";
    } },
  ];
  b.table(cols, sessions as unknown as Record<string, unknown>[]);

  // Member rates
  b.pageBreak();
  b.sectionHeading(
    locale === "sw" ? "Viwango vya Mahudhurio ya Wanachama" : "Member Attendance Rates",
    locale === "sw" ? "Wanachama 15 bora kwa kiwango cha mahudhurio." : "Top 15 members by attendance rate."
  );
  const members = await db.member.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true, fullName: true, regNumber: true,
      attendance: { select: { present: true } },
    },
  });
  const rates = members.map((m) => {
    const total = m.attendance.length;
    const present = m.attendance.filter((a) => a.present).length;
    return {
      fullName: m.fullName,
      regNumber: m.regNumber,
      totalSessions: total,
      presentCount: present,
      rate: total > 0 ? Math.round((present / total) * 100) : 0,
    };
  }).sort((a, b) => b.rate - a.rate).slice(0, 15);

  const memberCols: PdfTableColumn[] = [
    { header: locale === "sw" ? "Jina" : "Name", key: "fullName", width: 2.5 },
    { header: locale === "sw" ? "Namba" : "Reg. No.", key: "regNumber", width: 1.5 },
    { header: locale === "sw" ? "Waliopo" : "Present", key: "presentCount", width: 1, align: "right" },
    { header: locale === "sw" ? "Jumla" : "Total", key: "totalSessions", width: 1, align: "right" },
    { header: locale === "sw" ? "Kiwango" : "Rate", key: "rate", width: 1, align: "right", formatter: (v) => `${v}%` },
  ];
  b.table(memberCols, rates as unknown as Record<string, unknown>[]);
}

async function buildEventsReport(b: PdfReportBuilder, locale: "en" | "sw") {
  const byStatus = await db.event.groupBy({ by: ["status"], _count: true });
  b.sectionHeading(locale === "sw" ? "Matukio kwa Hali" : "Events by Status");
  const chart1 = await buildPieChart(
    byStatus.map((s) => LABELS.eventStatus[s.status] ?? s.status),
    byStatus.map((s) => s._count as number),
    locale === "sw" ? "Kwa Hali" : "By Status"
  );
  b.chart(chart1);

  const upcoming = await db.event.findMany({
    where: { status: "UPCOMING" },
    orderBy: { startDate: "asc" },
    take: 10,
    include: { _count: { select: { registrations: true } }, organizer: true },
  });

  b.sectionHeading(
    locale === "sw" ? "Matukio Yajayo" : "Upcoming Events",
    locale === "sw" ? "Matukio 10 yajayo na usajili." : "Next 10 events with registrations."
  );
  const cols: PdfTableColumn[] = [
    { header: locale === "sw" ? "Tukio" : "Event", key: "title", width: 3, formatter: (v) => (v as string).slice(0, 35) },
    { header: locale === "sw" ? "Tarehe" : "Date", key: "startDate", width: 1.5, align: "center", formatter: (v) => formatDate(v as string, { month: "short", day: "numeric", year: "numeric" }) },
    { header: locale === "sw" ? "Eneo" : "Location", key: "location", width: 1.5, formatter: (v) => (v as string) ?? "—" },
    { header: locale === "sw" ? "Uwezo" : "Capacity", key: "capacity", width: 1, align: "right", formatter: (v) => v ? String(v) : "—" },
    { header: locale === "sw" ? "Wamejiandikisha" : "Registered", key: "registered", width: 1, align: "right", formatter: (_v, row) => String((row as { _count: { registrations: number } })._count.registrations) },
  ];
  b.table(cols, upcoming as unknown as Record<string, unknown>[]);
}
