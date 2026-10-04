"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Users, Building2, Award, CalendarDays, TrendingUp, Activity,
  ArrowRight, Megaphone, CalendarCheck, Clock,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line, Area, AreaChart,
} from "recharts";
import { api, formatDate, initials, label, timeAgo } from "@/lib/utils/client";
import type { DashboardData } from "@/types";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import type { ViewKey } from "@/components/layout/app-shell";

const CHART_COLORS = [
  "oklch(0.55 0.12 175)", "oklch(0.7 0.15 75)", "oklch(0.62 0.22 25)",
  "oklch(0.6 0.2 305)", "oklch(0.65 0.18 230)", "oklch(0.55 0.15 145)",
  "oklch(0.7 0.18 90)", "oklch(0.6 0.22 340)",
];

export function DashboardHome({ onNavigate }: { onNavigate: (v: ViewKey) => void }) {
  const { user, member } = useAuth();
  const { t, locale } = useI18n();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<DashboardData>("/api/dashboard")
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) return <DashboardSkeleton />;

  const kpis = data.kpis;
  const facultyChart = data.membersByFaculty.map((f, i) => ({
    name: f.faculty.replace(/^School of /, "").slice(0, 18),
    full: f.faculty,
    value: f._count._all,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const genderChart = data.membersByGender.map((g) => ({
    name: label(t, "gender", g.gender),
    value: g._count._all,
  }));

  const attendanceChart = data.recentAttendance
    .slice()
    .reverse()
    .map((s) => ({
      name: formatDate(s.date, { month: "short", day: "numeric" }),
      present: s.present,
      total: s.total,
      rate: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0,
    }));

  const hour = new Date().getHours();
  const greetingKey =
    hour < 12 ? "greeting.morning" : hour < 17 ? "greeting.afternoon" : "greeting.evening";

  return (
    <div className="space-y-6">
      {/* Greeting hero */}
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground">
        <CardContent className="p-6 lg:p-8 relative">
          <div className="absolute inset-0 bg-grid-pattern opacity-10" />
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm opacity-90">{t(greetingKey)},</p>
              <h2 className="text-2xl lg:text-3xl font-serif tracking-tight">
                {member?.fullName ?? user?.name ?? t("common.friend")} 👋
              </h2>
              <p className="text-sm opacity-80">
                {t(`role.${user?.role ?? "MEMBER"}`)} ·{" "}
                {member?.faculty ?? t("common.orgName")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => onNavigate("announcements")}
                className="bg-primary-foreground/15 hover:bg-primary-foreground/25 text-primary-foreground backdrop-blur"
              >
                <Megaphone className="mr-2 h-4 w-4" /> {t("nav.announcements")}
              </Button>
              <Button
                variant="secondary"
                onClick={() => onNavigate("events")}
                className="bg-primary-foreground/15 hover:bg-primary-foreground/25 text-primary-foreground backdrop-blur"
              >
                <CalendarDays className="mr-2 h-4 w-4" /> {t("nav.events")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label={t("dashboard.totalMembers")}
          value={kpis.totalMembers}
          subtext={`${kpis.activeMembers} ${t("dashboard.activeMembers")}`}
          icon={Users}
          tone="primary"
          onClick={() => onNavigate("members")}
        />
        <KpiCard
          label={t("dashboard.ministries")}
          value={kpis.totalMinistries}
          subtext={t("dashboard.activeTeams")}
          icon={Building2}
          tone="accent"
          onClick={() => onNavigate("ministries")}
        />
        <KpiCard
          label={t("dashboard.skillsCatalogue")}
          value={kpis.totalSkills}
          subtext={`${kpis.pendingSkillRequests} ${t("dashboard.pending")}`}
          icon={Award}
          tone="warning"
          onClick={() => onNavigate("skills")}
        />
        <KpiCard
          label={t("dashboard.upcomingEventsCount")}
          value={kpis.upcomingEventsCount}
          subtext={`${t("dashboard.attendanceRate")} ${kpis.attendanceRate}%`}
          icon={CalendarDays}
          tone="success"
          onClick={() => onNavigate("events")}
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> {t("dashboard.recentAttendance")}
            </CardTitle>
            <CardDescription>{t("dashboard.recentAttendanceDesc", { n: attendanceChart.length })}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={attendanceChart} margin={{ top: 5, right: 10, bottom: 0, left: -16 }}>
                  <defs>
                    <linearGradient id="presentFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.55 0.12 175)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="oklch(0.55 0.12 175)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0 0 0 / 0.08)" vertical={false} />
                  <XAxis dataKey="name" stroke="oklch(0.5 0 0)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(0.5 0 0)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid oklch(0 0 0 / 0.1)", background: "oklch(1 0 0)", fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="present"
                    name={t("dashboard.present")}
                    stroke="oklch(0.45 0.12 175)"
                    strokeWidth={2}
                    fill="url(#presentFill)"
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name={t("dashboard.total")}
                    stroke="oklch(0.7 0.15 75)"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> {t("dashboard.genderDistribution")}
            </CardTitle>
            <CardDescription>{t("dashboard.genderDistributionDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderChart}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={3}
                    cornerRadius={6}
                  >
                    {genderChart.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid oklch(0 0 0 / 0.1)", background: "oklch(1 0 0)", fontSize: 12 }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" /> {t("dashboard.membersByFaculty")}
            </CardTitle>
            <CardDescription>{t("dashboard.membersByFacultyDesc", { n: facultyChart.length })}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={facultyChart} margin={{ top: 5, right: 10, bottom: 30, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0 0 0 / 0.08)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="oklch(0.5 0 0)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis stroke="oklch(0.5 0 0)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid oklch(0 0 0 / 0.1)", background: "oklch(1 0 0)", fontSize: 12 }}
                    formatter={(value, _name, item) => [value, item?.payload?.full ?? t("nav.members")]}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="oklch(0.55 0.12 175)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> {t("dashboard.recentAnnouncements")}
              </CardTitle>
              <CardDescription>{t("dashboard.recentAnnouncementsDesc")}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("announcements")}>
              {t("dashboard.viewAll")} <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {data.recentAnnouncements.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">{t("dashboard.noAnnouncements")}</p>
            )}
            {data.recentAnnouncements.map((a) => (
              <button
                key={a.id}
                onClick={() => onNavigate("announcements")}
                className="w-full text-left rounded-lg border border-border/60 p-3 hover:border-primary/40 hover:bg-primary/5 transition-all"
              >
                <div className="flex items-start gap-2">
                  <Megaphone className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug truncate">
                      {a.pinned && <span className="text-amber-500 mr-1">📌</span>}
                      {a.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.content}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <p className="text-[10px] text-muted-foreground">{timeAgo(a.createdAt, locale)}</p>
                      {a.priority === "HIGH" || a.priority === "URGENT" ? (
                        <Badge variant="destructive" className="text-[9px] h-4 px-1">{label(t, "priority", a.priority)}</Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming events */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" /> {t("dashboard.upcomingEventsCount")}
            </CardTitle>
            <CardDescription>{t("dashboard.upcomingEventsDesc")}</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onNavigate("events")}>
            {t("dashboard.viewAll")} <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent>
          {data.upcomingEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t("dashboard.noUpcoming")}</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.upcomingEvents.map((e) => {
                const date = new Date(e.startDate);
                const seatsLeft = e.capacity ? e.capacity - e._count.registrations : null;
                const fillRate = e.capacity ? (e._count.registrations / e.capacity) * 100 : 0;
                return (
                  <button
                    key={e.id}
                    onClick={() => onNavigate("events")}
                    className="text-left rounded-lg border border-border/60 p-4 hover:border-primary/40 hover:bg-primary/5 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug">{e.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{e.description}</p>
                      </div>
                      <div className="text-center shrink-0">
                        <p className="text-[10px] uppercase text-muted-foreground">
                          {date.toLocaleDateString(undefined, { month: "short" })}
                        </p>
                        <p className="text-lg font-semibold leading-none">{date.getDate()}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span>
                      {e.location && <span className="truncate">{e.location}</span>}
                    </div>
                    {e.capacity && (
                      <div className="mt-2">
                        <Progress value={fillRate} className="h-1.5" />
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {t("dashboard.registered", { count: e._count.registrations, capacity: e.capacity })} · {t("dashboard.seatsLeft", { n: seatsLeft ?? 0 })}
                        </p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  label, value, subtext, icon: Icon, tone, onClick,
}: {
  label: string;
  value: number | string;
  subtext: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "primary" | "accent" | "warning" | "success";
  onClick?: () => void;
}) {
  const toneClasses = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    warning: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  }[tone];

  return (
    <Card
      onClick={onClick}
      className="cursor-pointer card-hover"
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-2xl lg:text-3xl font-semibold leading-none">{value}</p>
            <p className="text-xs text-muted-foreground">{subtext}</p>
          </div>
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${toneClasses}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full rounded-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <Skeleton className="lg:col-span-2 h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}
