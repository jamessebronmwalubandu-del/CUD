"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CalendarCheck, Plus, Eye, Pencil, Trash2, Search, Users, BarChart3, TrendingUp, Clock,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import { api, formatDate, initials, label, LABELS } from "@/lib/utils/client";
import type { AttendanceSession, AttendanceType, Member, Ministry } from "@/types";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { toast } from "sonner";

const CHART_COLORS = [
  "oklch(0.55 0.12 175)", "oklch(0.7 0.15 75)", "oklch(0.62 0.22 25)",
  "oklch(0.6 0.2 305)", "oklch(0.65 0.18 230)", "oklch(0.55 0.15 145)",
  "oklch(0.7 0.18 90)", "oklch(0.6 0.22 340)",
];

const TOOLTIP_STYLE = { borderRadius: 12, border: "1px solid oklch(0 0 0 / 0.1)", background: "oklch(1 0 0)", fontSize: 12 };

type SessionItem = AttendanceSession & { presentCount?: number; totalCount?: number; ministry?: Ministry | null };

export function AttendanceView() {
  const { t } = useI18n();
  const { user, member } = useAuth();
  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [typeFilter, setTypeFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SessionItem | null>(null);
  const [viewing, setViewing] = useState<SessionItem | null>(null);
  const [deleting, setDeleting] = useState<SessionItem | null>(null);
  const [byType, setByType] = useState<{ name: string; rate: number; count: number }[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (typeFilter) params.set("type", typeFilter);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      const d = await api.get<{ items: SessionItem[]; total: number }>(`/api/attendance?${params}`);
      setSessions(d.items ?? []);
      setTotal(d.total ?? 0);

      // Aggregate by type for chart
      const map = new Map<string, { present: number; total: number; count: number }>();
      for (const s of d.items ?? []) {
        const typ = s.type;
        if (!map.has(typ)) map.set(typ, { present: 0, total: 0, count: 0 });
        const cur = map.get(typ)!;
        cur.present += s.presentCount ?? 0;
        cur.total += s.totalCount ?? 0;
        cur.count += 1;
      }
      setByType(
        Array.from(map.entries()).map(([typ, v]) => ({
          name: label(t, "attendanceType", typ as AttendanceType),
          rate: v.total > 0 ? Math.round((v.present / v.total) * 100) : 0,
          count: v.count,
        })),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("attendance.loadFailed"));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, typeFilter, fromDate, toDate]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const totalRecords = useMemo(() => sessions.reduce((s, x) => s + (x.totalCount ?? 0), 0), [sessions]);
  const avgRate = useMemo(() => {
    const tot = sessions.reduce((s, x) => s + (x.totalCount ?? 0), 0);
    const pres = sessions.reduce((s, x) => s + (x.presentCount ?? 0), 0);
    return tot > 0 ? Math.round((pres / tot) * 100) : 0;
  }, [sessions]);
  const mostRecent = sessions[0];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-serif tracking-tight flex items-center gap-2">
            <CalendarCheck className="h-6 w-6 text-primary" /> {t("attendance.title")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("attendance.subtitle")}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="mr-1.5 h-4 w-4" /> {t("attendance.recordNew")}
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CalendarCheck} label={t("attendance.totalSessions")} value={total} tone="primary" />
        <StatCard icon={Users} label={t("attendance.totalRecords")} value={totalRecords} tone="accent" />
        <StatCard icon={TrendingUp} label={t("attendance.avgAttendance")} value={`${avgRate}%`} tone="success" />
        <StatCard icon={Clock} label={t("attendance.mostRecent")} value={mostRecent ? formatDate(mostRecent.date, { month: "short", day: "numeric" }) : "—"} tone="warning" subtext={mostRecent?.title} />
      </div>

      {/* Chart */}
      {byType.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> {t("attendance.attendanceByType")}</CardTitle>
            <CardDescription>{t("attendance.attendanceByTypeDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byType} margin={{ top: 5, right: 10, bottom: 30, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0 0 0 / 0.08)" vertical={false} />
                  <XAxis dataKey="name" stroke="oklch(0.5 0 0)" fontSize={10} tickLine={false} axisLine={false} angle={-20} textAnchor="end" height={60} interval={0} />
                  <YAxis stroke="oklch(0.5 0 0)" fontSize={11} tickLine={false} axisLine={false} unit="%" />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v}%`, t("attendance.rate")]} />
                  <Bar dataKey="rate" radius={[6, 6, 0, 0]}>
                    {byType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={typeFilter || "ALL"} onValueChange={(v) => { setPage(1); setTypeFilter(v === "ALL" ? "" : v); }}>
              <SelectTrigger className="w-full sm:w-52"><SelectValue placeholder={t("attendance.allTypes")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("attendance.allTypes")}</SelectItem>
                {Object.keys(LABELS.attendanceType).map((v) => <SelectItem key={v} value={v}>{label(t, "attendanceType", v)}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex-1 flex gap-2 items-center">
              <Input type="date" value={fromDate} onChange={(e) => { setPage(1); setFromDate(e.target.value); }} className="text-sm" />
              <span className="text-xs text-muted-foreground">{t("attendance.to")}</span>
              <Input type="date" value={toDate} onChange={(e) => { setPage(1); setToDate(e.target.value); }} className="text-sm" />
            </div>
            {(typeFilter || fromDate || toDate) && (
              <Button variant="ghost" onClick={() => { setTypeFilter(""); setFromDate(""); setToDate(""); setPage(1); }}>{t("common.reset")}</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sessions table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <CalendarCheck className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              {t("attendance.noSessions")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("attendance.session")}</TableHead>
                    <TableHead>{t("attendance.sessionType")}</TableHead>
                    <TableHead>{t("common.date")}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("nav.ministries")}</TableHead>
                    <TableHead className="w-40">{t("attendance.title")}</TableHead>
                    <TableHead className="text-right">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((s) => {
                    const present = s.presentCount ?? 0;
                    const tot = s.totalCount ?? 0;
                    const rate = tot > 0 ? Math.round((present / tot) * 100) : 0;
                    return (
                      <TableRow key={s.id}>
                        <TableCell>
                          <p className="font-medium text-sm truncate max-w-48">{s.title}</p>
                          {s.notes && <p className="text-xs text-muted-foreground truncate max-w-48">{s.notes}</p>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">{label(t, "attendanceType", s.type)}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(s.date, { month: "short", day: "numeric", year: "numeric" })}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{s.ministry?.name ?? "—"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={rate} className="h-1.5 w-16" />
                            <span className="text-xs font-medium">{present}/{tot}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">⋯</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setViewing(s)}><Eye className="mr-2 h-3.5 w-3.5" /> {t("attendance.viewRoster")}</DropdownMenuItem>
                              {isAdmin && <DropdownMenuItem onClick={() => { setEditing(s); setShowForm(true); }}><Pencil className="mr-2 h-3.5 w-3.5" /> {t("common.edit")}</DropdownMenuItem>}
                              {isAdmin && (
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleting(s)}>
                                  <Trash2 className="mr-2 h-3.5 w-3.5" /> {t("common.delete")}
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{t("common.page")} {page} {t("common.of")} {totalPages} · {total} {t("attendance.session").toLowerCase()}</p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>{t("common.previous")}</Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>{t("common.next")}</Button>
          </div>
        </div>
      )}

      {/* Record/Edit form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t("attendance.editSession") : t("attendance.recordDialogTitle")}</DialogTitle>
            <DialogDescription>
              {editing ? t("attendance.editingTitle", { title: editing.title }) : t("attendance.markPresentDesc")}
            </DialogDescription>
          </DialogHeader>
          <SessionForm
            session={editing}
            memberId={member?.id}
            onSaved={() => { setShowForm(false); load(); }}
            onCancel={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* View roster dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {viewing && <RosterView session={viewing} />}
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("attendance.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("attendance.deleteConfirmMsg", { title: deleting?.title ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleting) return;
                try {
                  await api.delete(`/api/attendance/${deleting.id}`);
                  toast.success(t("attendance.sessionDeleted"));
                  setDeleting(null);
                  load();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : t("attendance.deleteFailed"));
                }
              }}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone, subtext }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number | string; tone: "primary" | "accent" | "warning" | "success"; subtext?: string }) {
  const toneClass = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-amber-500/10 text-amber-600",
    warning: "bg-rose-500/10 text-rose-600",
    success: "bg-emerald-500/10 text-emerald-600",
  }[tone];
  return (
    <Card>
      <CardContent className="p-5 flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-semibold leading-none">{value}</p>
          {subtext && <p className="text-xs text-muted-foreground truncate max-w-32">{subtext}</p>}
        </div>
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function SessionForm({
  session, memberId, onSaved, onCancel,
}: { session: SessionItem | null; memberId?: string; onSaved: () => void; onCancel: () => void }) {
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: session?.title ?? "",
    type: session?.type ?? "SUNDAY_FELLOWSHIP",
    date: session ? new Date(session.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    ministryId: session?.ministryId ?? "",
    notes: session?.notes ?? "",
  });
  const [members, setMembers] = useState<Member[]>([]);
  const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    Promise.all([
      api.get<{ items: Member[] }>("/api/members?pageSize=200"),
      api.get<{ items: Ministry[] }>("/api/ministries"),
    ]).then(([m, mins]) => {
      setMembers(m.items ?? []);
      setMinistries(mins.items ?? []);
    }).catch(() => { /* noop */ }).finally(() => setLoadingMembers(false));

    // Load existing records if editing
    if (session) {
      api.get<AttendanceSession & { records?: { memberId: string; present: boolean }[] }>(`/api/attendance/${session.id}`)
        .then((s) => {
          const present = new Set<string>();
          (s.records ?? []).forEach((r) => { if (r.present) present.add(r.memberId); });
          setPresentIds(present);
        })
        .catch(() => { /* noop */ });
    }
  }, [session]);

  const filtered = useMemo(() => {
    const list = form.ministryId ? members.filter((m) => m.ministries?.some((mm) => mm.ministryId === form.ministryId)) : members;
    if (!search) return list;
    return list.filter((m) => m.fullName.toLowerCase().includes(search.toLowerCase()) || m.regNumber.toLowerCase().includes(search.toLowerCase()));
  }, [members, form.ministryId, search]);

  const toggle = (id: string) => {
    setPresentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.type || !form.date) {
      toast.error(t("validation.required", { field: `${t("common.title")}, ${t("attendance.sessionType")}, ${t("common.date")}` }));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        ministryId: form.ministryId || null,
        presentMemberIds: Array.from(presentIds),
      };
      if (session) {
        await api.put(`/api/attendance/${session.id}`, {
          ...payload,
          records: members.map((m) => ({ memberId: m.id, present: presentIds.has(m.id) })),
        });
        toast.success(t("attendance.sessionUpdated"));
      } else {
        await api.post("/api/attendance", payload);
        toast.success(t("attendance.sessionCreated"));
      }
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("attendance.saveFailed"));
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs font-medium">{t("common.title")} <span className="text-destructive">*</span></Label>
          <Input value={form.title} onChange={(e) => set("title", e.target.value)} required autoFocus placeholder={t("attendance.titlePlaceholder")} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">{t("attendance.sessionType")} <span className="text-destructive">*</span></Label>
          <Select value={form.type} onValueChange={(v) => set("type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.keys(LABELS.attendanceType).map((v) => <SelectItem key={v} value={v}>{label(t, "attendanceType", v)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">{t("common.date")} <span className="text-destructive">*</span></Label>
          <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">{t("documents.ministry")}</Label>
          <Select value={form.ministryId || "NONE"} onValueChange={(v) => set("ministryId", v === "NONE" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder={t("attendance.allMembers")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">{t("attendance.allMembers")}</SelectItem>
              {ministries.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">{t("attendance.notesLabel")}</Label>
          <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder={t("attendance.notesPlaceholder")} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">{t("attendance.markPresentCount", { n: presentIds.size })}</Label>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setPresentIds(new Set(filtered.map((m) => m.id)))}>{t("attendance.selectAll")}</Button>
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setPresentIds(new Set())}>{t("common.clear")}</Button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("attendance.searchMembers")} className="pl-9" />
        </div>
        {loadingMembers ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        ) : (
          <ScrollArea className="h-64 rounded-md border">
            <div className="divide-y">
              {filtered.map((m) => (
                <label key={m.id} className="flex items-center gap-3 p-2.5 cursor-pointer hover:bg-accent/50">
                  <Checkbox checked={presentIds.has(m.id)} onCheckedChange={() => toggle(m.id)} />
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary/15 text-primary text-[10px]">{initials(m.fullName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.fullName}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">{m.regNumber}</p>
                  </div>
                </label>
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">{t("members.noMembers")}</p>
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>{t("common.cancel")}</Button>
        <Button type="submit" disabled={saving}>{saving ? t("common.saving") : session ? t("attendance.updateSession") : t("attendance.recordSession")}</Button>
      </DialogFooter>
    </form>
  );
}

function RosterView({ session }: { session: SessionItem }) {
  const { t } = useI18n();
  const [detail, setDetail] = useState<(AttendanceSession & { records?: { memberId: string; present: boolean; member: Member }[]; ministry?: Ministry | null }) | null>(null);
  useEffect(() => {
    api.get<AttendanceSession & { records?: { memberId: string; present: boolean; member: Member }[]; ministry?: Ministry | null }>(`/api/attendance/${session.id}`)
      .then(setDetail)
      .catch((err) => toast.error(err instanceof Error ? err.message : t("attendance.loadFailed")));
  }, [session.id, t]);

  const present = detail?.records?.filter((r) => r.present) ?? [];
  const absent = detail?.records?.filter((r) => !r.present) ?? [];
  const rate = (detail?.records?.length ?? 0) > 0 ? Math.round((present.length / (detail?.records?.length ?? 1)) * 100) : 0;

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle className="font-serif">{session.title}</DialogTitle>
        <DialogDescription>
          {label(t, "attendanceType", session.type)} · {formatDate(session.date, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          {session.ministry ? ` · ${session.ministry.name}` : ""}
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-semibold text-emerald-600">{present.length}</p>
          <p className="text-xs text-muted-foreground">{t("attendance.present")}</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-semibold text-rose-600">{absent.length}</p>
          <p className="text-xs text-muted-foreground">{t("attendance.absent")}</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-semibold text-primary">{rate}%</p>
          <p className="text-xs text-muted-foreground">{t("attendance.rate")}</p>
        </div>
      </div>

      {session.notes && (
        <div className="rounded-md bg-muted/40 p-3 text-sm">
          <p className="text-xs text-muted-foreground mb-1">{t("attendance.notesLabel")}</p>
          <p>{session.notes}</p>
        </div>
      )}

      <ScrollArea className="h-72 rounded-md border">
        <div className="divide-y">
          {detail?.records?.map((r) => (
            <div key={r.memberId} className="flex items-center gap-3 p-2.5">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary/15 text-primary text-[10px]">{initials(r.member.fullName)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.member.fullName}</p>
                <p className="text-xs text-muted-foreground font-mono truncate">{r.member.regNumber}</p>
              </div>
              <Badge variant="outline" className={`text-[10px] ${r.present ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border-rose-500/20"}`}>
                {r.present ? t("attendance.present") : t("attendance.absent")}
              </Badge>
            </div>
          )) ?? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
