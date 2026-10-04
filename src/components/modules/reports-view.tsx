"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
  PieChart, Pie, Legend, LineChart, Line,
} from "recharts";
import {
  Users, Building2, Award, CalendarCheck, CalendarDays, FileText, Megaphone, TrendingUp, Download, FileDown, Printer,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api, formatDate, label, LABELS } from "@/lib/utils/client";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { toast } from "sonner";

const CHART_COLORS = [
  "oklch(0.55 0.12 175)", "oklch(0.7 0.15 75)", "oklch(0.62 0.22 25)",
  "oklch(0.6 0.2 305)", "oklch(0.65 0.18 230)", "oklch(0.55 0.15 145)",
  "oklch(0.7 0.18 90)", "oklch(0.6 0.22 340)",
];
const TOOLTIP_STYLE = { borderRadius: 12, border: "1px solid oklch(0 0 0 / 0.1)", background: "oklch(1 0 0)", fontSize: 12 };

type ReportType = "overview" | "members" | "ministries" | "skills" | "attendance" | "events";

export function ReportsView() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const [type, setType] = useState<ReportType>("overview");
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setData(null);
      try {
        const d = await api.get(`/api/reports?type=${type}`);
        if (!cancelled) setData(d);
      } catch (err) {
        if (!cancelled) toast.error(err instanceof Error ? err.message : t("reports.loadFailed"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [type, t]);

  if (user?.role !== "SUPER_ADMIN" && user?.role !== "ADMIN") {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          {t("reports.noPermission")}
        </CardContent>
      </Card>
    );
  }

  const exportPdf = () => {
    window.open(`/api/reports/pdf/${type}?locale=${locale}`, "_blank");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap no-print">
        <div>
          <h2 className="text-2xl font-serif tracking-tight flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" /> {t("reports.title")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{t("reports.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <FileDown className="mr-1.5 h-4 w-4" /> {t("reports.exportPdf")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportPdf}>
                <FileDown className="mr-2 h-3.5 w-3.5" /> {t("reports.exportPdfDesc")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.print()}>
                <Printer className="mr-2 h-3.5 w-3.5" /> {t("common.exportPdf")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs value={type} onValueChange={(v) => setType(v as ReportType)} className="no-print">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">{t("reports.overview")}</TabsTrigger>
          <TabsTrigger value="members">{t("reports.members")}</TabsTrigger>
          <TabsTrigger value="ministries">{t("reports.ministries")}</TabsTrigger>
          <TabsTrigger value="skills">{t("reports.skills")}</TabsTrigger>
          <TabsTrigger value="attendance">{t("reports.attendance")}</TabsTrigger>
          <TabsTrigger value="events">{t("reports.events")}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="print:hidden space-y-4">
        {loading ? (
          <div className="grid lg:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
          </div>
        ) : (
          <>
            {type === "overview" && <OverviewReport data={data as OverviewData | null} />}
            {type === "members" && <MembersReport data={data as MembersData | null} />}
            {type === "ministries" && <MinistriesReport data={data as MinistriesData | null} />}
            {type === "skills" && <SkillsReport data={data as SkillsData | null} />}
            {type === "attendance" && <AttendanceReport data={data as AttendanceData | null} />}
            {type === "events" && <EventsReport data={data as EventsData | null} />}
          </>
        )}
      </div>

      {/* Print-only summary */}
      <div className="hidden print:block">
        <h1 className="text-2xl font-serif mb-4">
          {t("common.orgName")} — {t("reports.printTitle", { name: type.charAt(0).toUpperCase() + type.slice(1) })}
        </h1>
        <p className="text-sm">{t("reports.generatedOn")} {formatDate(new Date(), { year: "numeric", month: "long", day: "numeric" })}</p>
      </div>
    </div>
  );
}

/* ---------------- Overview ---------------- */
interface OverviewData {
  totalMembers: number; activeMembers: number; totalMinistries: number; totalSkills: number;
  pendingSkillRequests: number; totalSessions: number; upcomingEvents: number;
  totalDocuments: number; totalAnnouncements: number;
}

function OverviewReport({ data }: { data: OverviewData | null }) {
  const { t } = useI18n();
  if (!data) return null;
  const kpis = [
    { label: t("reports.totalMembers"), value: data.totalMembers, icon: Users, tone: "primary" },
    { label: t("reports.activeMembers"), value: data.activeMembers, icon: Users, tone: "success" },
    { label: t("reports.totalMinistries"), value: data.totalMinistries, icon: Building2, tone: "accent" },
    { label: t("reports.totalSkills"), value: data.totalSkills, icon: Award, tone: "primary" },
    { label: t("reports.pendingRequests"), value: data.pendingSkillRequests, icon: Award, tone: "warning" },
    { label: t("reports.sessionsHeld"), value: data.totalSessions, icon: CalendarCheck, tone: "accent" },
    { label: t("reports.upcomingEvents"), value: data.upcomingEvents, icon: CalendarDays, tone: "success" },
    { label: t("reports.documents"), value: data.totalDocuments, icon: FileText, tone: "primary" },
    { label: t("reports.announcements"), value: data.totalAnnouncements, icon: Megaphone, tone: "accent" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
      {kpis.map((k) => (
        <Card key={k.label}>
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{k.label}</p>
              <p className="text-3xl font-serif font-semibold mt-1">{k.value}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <k.icon className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ---------------- Members ---------------- */
interface MembersData {
  byFaculty: { faculty: string; _count: { _all: number } }[];
  byGender: { gender: string; _count: { _all: number } }[];
  byYearOfStudy: { yearOfStudy: string; _count: { _all: number } }[];
  byStatus: { status: string; _count: { _all: number } }[];
}

function MembersReport({ data }: { data: MembersData | null }) {
  const { t } = useI18n();
  if (!data) return null;
  const facultyArr = Array.isArray(data.byFaculty) ? data.byFaculty : [];
  const genderArr = Array.isArray(data.byGender) ? data.byGender : [];
  const yearArr = Array.isArray(data.byYearOfStudy) ? data.byYearOfStudy : [];
  const statusArr = Array.isArray(data.byStatus) ? data.byStatus : [];
  const faculty = facultyArr.map((f, i) => ({
    name: f.faculty.replace(/^School of /, "").slice(0, 18),
    full: f.faculty,
    value: f._count._all,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));
  const gender = genderArr.map((g) => ({ name: label(t, "gender", g.gender), value: g._count._all }));
  const year = yearArr.map((y) => ({ name: label(t, "year", y.yearOfStudy), value: y._count._all }));
  const status = statusArr.map((s) => ({ name: label(t, "status", s.status), value: s._count._all }));

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <ChartCard title={t("reports.membersByFaculty")}>
        <BarChart data={faculty} margin={{ top: 5, right: 10, bottom: 30, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0 0 0 / 0.08)" vertical={false} />
          <XAxis dataKey="name" stroke="oklch(0.5 0 0)" fontSize={10} tickLine={false} axisLine={false} angle={-20} textAnchor="end" height={60} interval={0} />
          <YAxis stroke="oklch(0.5 0 0)" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, _n, item) => [v, item?.payload?.full ?? t("nav.members")]} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {faculty.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ChartCard>
      <ChartCard title={t("reports.membersByGender")}>
        <PieChart>
          <Pie data={gender} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={3} cornerRadius={6}>
            {gender.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ChartCard>
      <ChartCard title={t("reports.membersByYear")}>
        <BarChart data={year} margin={{ top: 5, right: 10, bottom: 5, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0 0 0 / 0.08)" vertical={false} />
          <XAxis dataKey="name" stroke="oklch(0.5 0 0)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="oklch(0.5 0 0)" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="oklch(0.55 0.12 175)" />
        </BarChart>
      </ChartCard>
      <ChartCard title={t("reports.membersByStatus")}>
        <PieChart>
          <Pie data={status} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={3} cornerRadius={6}>
            {status.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ChartCard>
    </div>
  );
}

/* ---------------- Ministries ---------------- */
interface MinistriesData {
  items: { id: string; name: string; color: string | null; memberCount: number; documentCount: number; sessionCount: number }[];
}

function MinistriesReport({ data }: { data: MinistriesData | null }) {
  const { t } = useI18n();
  if (!data) return null;
  const items = Array.isArray(data.items) ? data.items : [];
  const chart = items.map((m, i) => ({
    name: m.name,
    Members: m.memberCount,
    Documents: m.documentCount,
    Sessions: m.sessionCount,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("reports.ministryComparison")}</CardTitle>
          <CardDescription>{t("reports.ministryComparisonDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 5, right: 10, bottom: 30, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0 0 0 / 0.08)" vertical={false} />
                <XAxis dataKey="name" stroke="oklch(0.5 0 0)" fontSize={10} tickLine={false} axisLine={false} angle={-20} textAnchor="end" height={60} interval={0} />
                <YAxis stroke="oklch(0.5 0 0)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Members" fill="oklch(0.55 0.12 175)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Documents" fill="oklch(0.7 0.15 75)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Sessions" fill="oklch(0.62 0.22 25)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">{t("reports.ministryTable")}</CardTitle>
          <Button variant="outline" size="sm" onClick={() => exportMinistriesCsv(items, t)}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> {t("common.exportCsv")}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("nav.ministries")}</TableHead>
                  <TableHead className="text-right">{t("ministries.members")}</TableHead>
                  <TableHead className="text-right">{t("ministries.documents")}</TableHead>
                  <TableHead className="text-right">{t("ministries.sessions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: m.color ?? "#0f766e" }} />
                        <span className="font-medium">{m.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">{m.memberCount}</TableCell>
                    <TableCell className="text-right">{m.documentCount}</TableCell>
                    <TableCell className="text-right">{m.sessionCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------------- Skills ---------------- */
interface SkillsData {
  byStatus: { status: string; _count: { _all: number } }[];
  topSkills: { id: string; name: string; count: number }[];
  byCategory: { category: string | null; _count: { _all: number } }[];
}

function SkillsReport({ data }: { data: SkillsData | null }) {
  const { t } = useI18n();
  if (!data) return null;
  const topArr = Array.isArray(data.topSkills) ? data.topSkills : [];
  const statusArr = Array.isArray(data.byStatus) ? data.byStatus : [];
  const catArr = Array.isArray(data.byCategory) ? data.byCategory : [];
  const top = topArr.map((s, i) => ({
    name: s.name.slice(0, 22),
    full: s.name,
    value: s.count,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));
  const byStatus = statusArr.map((s) => ({ name: label(t, "skillStatus", s.status), value: s._count._all }));
  const byCat = catArr.map((c) => ({ name: c.category ?? t("skills.uncategorised"), value: c._count._all }));

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <ChartCard title={t("reports.topSkills")} description={t("reports.topSkillsDesc")}>
        <BarChart data={top} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0 0 0 / 0.08)" horizontal={false} />
          <XAxis type="number" stroke="oklch(0.5 0 0)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" stroke="oklch(0.5 0 0)" fontSize={10} tickLine={false} axisLine={false} width={90} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, _n, item) => [`${v} ${t("skills.members")}`, item?.payload?.full ?? t("skills.title")]} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {top.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ChartCard>
      <ChartCard title={t("reports.skillRequestsByStatus")}>
        <PieChart>
          <Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={3} cornerRadius={6}>
            {byStatus.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ChartCard>
      <ChartCard title={t("reports.skillsByCategory")} description={t("reports.skillsByCategoryDesc")}>
        <BarChart data={byCat} margin={{ top: 5, right: 10, bottom: 30, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0 0 0 / 0.08)" vertical={false} />
          <XAxis dataKey="name" stroke="oklch(0.5 0 0)" fontSize={10} tickLine={false} axisLine={false} angle={-20} textAnchor="end" height={60} interval={0} />
          <YAxis stroke="oklch(0.5 0 0)" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="oklch(0.55 0.12 175)" />
        </BarChart>
      </ChartCard>
    </div>
  );
}

/* ---------------- Attendance ---------------- */
interface AttendanceData {
  items: { id: string; title: string; type: string; date: string; present: number; total: number; rate: number }[];
  byType: { type: string; _count: { _all: number } }[];
  attendanceByMember: { id: string; fullName: string; regNumber: string; totalSessions: number; presentCount: number; rate: number }[];
}

function AttendanceReport({ data }: { data: AttendanceData | null }) {
  const { t } = useI18n();
  if (!data || !data.items) return null;
  const items = Array.isArray(data.items) ? data.items : [];
  const attendanceByMember = Array.isArray(data.attendanceByMember) ? data.attendanceByMember : [];
  const chart = items.slice().reverse().map((s) => ({
    name: formatDate(s.date, { month: "short", day: "numeric" }),
    title: s.title,
    rate: Math.round(s.rate),
  }));
  const line = items.slice().reverse().map((s) => ({
    name: formatDate(s.date, { month: "short", day: "numeric" }),
    present: s.present,
    total: s.total,
  }));
  const topMembers = [...attendanceByMember].sort((a, b) => b.rate - a.rate).slice(0, 15);

  return (
    <div className="space-y-4">
      <ChartCard title={t("reports.attendanceRatePerSession")} description={t("reports.attendanceRatePerSessionDesc")}>
        <BarChart data={chart} margin={{ top: 5, right: 10, bottom: 30, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0 0 0 / 0.08)" vertical={false} />
          <XAxis dataKey="name" stroke="oklch(0.5 0 0)" fontSize={10} tickLine={false} axisLine={false} angle={-25} textAnchor="end" height={60} interval={0} />
          <YAxis stroke="oklch(0.5 0 0)" fontSize={11} tickLine={false} axisLine={false} unit="%" />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v}%`, t("attendance.rate")]} />
          <Bar dataKey="rate" radius={[6, 6, 0, 0]} fill="oklch(0.55 0.12 175)" />
        </BarChart>
      </ChartCard>

      <ChartCard title={t("reports.sessionBySession")} description={t("reports.sessionBySessionDesc")}>
        <LineChart data={line} margin={{ top: 5, right: 10, bottom: 5, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0 0 0 / 0.08)" vertical={false} />
          <XAxis dataKey="name" stroke="oklch(0.5 0 0)" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis stroke="oklch(0.5 0 0)" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="present" name={t("attendance.present")} stroke="oklch(0.55 0.12 175)" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="total" name={t("attendance.total")} stroke="oklch(0.7 0.15 75)" strokeWidth={2} strokeDasharray="4 4" dot={false} />
        </LineChart>
      </ChartCard>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">{t("reports.memberAttendanceRates")}</CardTitle>
          <Button variant="outline" size="sm" onClick={() => exportMembersCsv(attendanceByMember, t)}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> {t("common.exportCsv")}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("reports.member")}</TableHead>
                  <TableHead>{t("members.regNoShort")}</TableHead>
                  <TableHead className="text-right">{t("attendance.present")}</TableHead>
                  <TableHead className="text-right">{t("attendance.total")}</TableHead>
                  <TableHead className="text-right">{t("attendance.rate")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topMembers.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.fullName}</TableCell>
                    <TableCell className="font-mono text-xs">{m.regNumber}</TableCell>
                    <TableCell className="text-right">{m.presentCount}</TableCell>
                    <TableCell className="text-right">{m.totalSessions}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={m.rate >= 75 ? "bg-emerald-500/10 text-emerald-600" : m.rate >= 50 ? "bg-amber-500/10 text-amber-600" : "bg-rose-500/10 text-rose-600"}>
                        {Math.round(m.rate)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------------- Events ---------------- */
interface EventsData {
  byStatus: { status: string; _count: { _all: number } }[];
  upcoming: { id: string; title: string; startDate: string; location: string | null; capacity: number | null; registrations: number }[];
}

function EventsReport({ data }: { data: EventsData | null }) {
  const { t } = useI18n();
  if (!data) return null;
  const statusArr = Array.isArray(data.byStatus) ? data.byStatus : [];
  const upcomingArr = Array.isArray(data.upcoming) ? data.upcoming : [];
  const byStatus = statusArr.map((s) => ({ name: label(t, "eventStatus", s.status), value: s._count._all }));
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <ChartCard title={t("reports.eventsByStatus")}>
        <PieChart>
          <Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={3} cornerRadius={6}>
            {byStatus.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ChartCard>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("reports.upcomingEvents")}</CardTitle>
          <CardDescription>{t("reports.upcomingEventsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("reports.event")}</TableHead>
                  <TableHead>{t("common.date")}</TableHead>
                  <TableHead className="text-right">{t("reports.registeredColumn")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingArr.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">
                      {e.title}
                      {e.location && <p className="text-xs text-muted-foreground">{e.location}</p>}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(e.startDate, { month: "short", day: "numeric" })}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="text-[10px]">
                        {e.registrations}{e.capacity ? `/${e.capacity}` : ""}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {upcomingArr.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-6">{t("reports.noUpcoming")}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------------- Shared chart card ---------------- */
function ChartCard({ title, description, children }: { title: string; description?: string; children: React.ReactElement }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------- CSV helpers ---------------- */
type TFunc = (key: string, params?: Record<string, string | number>) => string;

function exportMinistriesCsv(items: MinistriesData["items"], t: TFunc) {
  const headers = [t("nav.ministries"), t("ministries.members"), t("ministries.documents"), t("ministries.sessions")];
  const rows = items.map((m) => [m.name, m.memberCount, m.documentCount, m.sessionCount]);
  downloadCsv(headers, rows, "ministries");
}

function exportMembersCsv(items: AttendanceData["attendanceByMember"], t: TFunc) {
  const headers = [t("common.name"), t("members.regNoShort"), t("attendance.totalSessions"), t("attendance.present"), `${t("attendance.rate")} %`];
  const rows = items.map((m) => [m.fullName, m.regNumber, m.totalSessions, m.presentCount, Math.round(m.rate)]);
  downloadCsv(headers, rows, "member-attendance");
}

function downloadCsv(headers: string[], rows: (string | number)[][], name: string) {
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
