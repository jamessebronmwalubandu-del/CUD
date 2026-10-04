"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Pencil, Trash2, Users, Filter, Download } from "lucide-react";
import { api, label, initials, LABELS } from "@/lib/utils/client";
import type { Member } from "@/types";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function MembersView() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [q, setQ] = useState("");
  const [facultyFilter, setFacultyFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [editing, setEditing] = useState<Member | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<Member | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (q) params.set("q", q);
      if (facultyFilter) params.set("faculty", facultyFilter);
      if (yearFilter) params.set("yearOfStudy", yearFilter);
      if (genderFilter) params.set("gender", genderFilter);
      const d = await api.get<{ items: Member[]; total: number }>(`/api/members?${params}`);
      setMembers(d.items ?? []);
      setTotal(d.total ?? 0);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : t("members.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(debounce);
  }, [page, q, facultyFilter, yearFilter, genderFilter]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const exportCsv = () => {
    const headers = [
      t("members.fullName"),
      t("members.regNumber"),
      t("common.phone"),
      t("common.email"),
      t("members.gender"),
      t("members.faculty"),
      t("members.department"),
      t("members.course"),
      t("members.yearOfStudy"),
      t("members.hostel"),
      t("common.status"),
    ];
    const rows = members.map((m) => [
      m.fullName, m.regNumber, m.phoneNumber, m.email ?? "",
      label(t, "gender", m.gender), m.faculty, m.department, m.course,
      label(t, "year", m.yearOfStudy), m.hostel ?? "",
      label(t, "status", m.status),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `members-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-serif tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> {t("members.title")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("members.subtitle", { total })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!members.length}>
            <Download className="mr-1.5 h-4 w-4" /> {t("common.exportCsv")}
          </Button>
          <Button onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="mr-1.5 h-4 w-4" /> {t("members.addMember")}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("members.searchPlaceholder")}
                value={q}
                onChange={(e) => { setPage(1); setQ(e.target.value); }}
                className="pl-9"
              />
            </div>
            <Select value={yearFilter || "ALL"} onValueChange={(v) => { setPage(1); setYearFilter(v === "ALL" ? "" : v); }}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder={t("members.yearOfStudy")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("members.allYears")}</SelectItem>
                {Object.keys(LABELS.year).map((v) => (
                  <SelectItem key={v} value={v}>{label(t, "year", v)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={genderFilter || "ALL"} onValueChange={(v) => { setPage(1); setGenderFilter(v === "ALL" ? "" : v); }}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder={t("members.gender")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("members.allGenders")}</SelectItem>
                <SelectItem value="MALE">{t("common.male")}</SelectItem>
                <SelectItem value="FEMALE">{t("common.female")}</SelectItem>
              </SelectContent>
            </Select>
            {(q || facultyFilter || yearFilter || genderFilter) && (
              <Button
                variant="ghost"
                onClick={() => { setQ(""); setFacultyFilter(""); setYearFilter(""); setGenderFilter(""); setPage(1); }}
              >
                {t("common.reset")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : members.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              {t("members.noMembers")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("nav.members")}</TableHead>
                    <TableHead>{t("members.regNoShort")}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("members.course")}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t("members.yearOfStudy")}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t("common.phone")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                    <TableHead className="text-right">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/15 text-primary text-xs font-medium">
                              {initials(m.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{m.fullName}</p>
                            <p className="text-xs text-muted-foreground truncate">{m.email ?? "—"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{m.regNumber}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        <div className="truncate max-w-48">{m.course}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-48">{m.faculty}</div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant="outline" className="text-[10px]">{label(t, "year", m.yearOfStudy)}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm font-mono">{m.phoneNumber}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            m.status === "ACTIVE"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]"
                              : "bg-muted text-muted-foreground text-[10px]"
                          }
                        >
                          {label(t, "status", m.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">⋯</Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditing(m); setShowForm(true); }}>
                              <Pencil className="mr-2 h-3.5 w-3.5" /> {t("common.edit")}
                            </DropdownMenuItem>
                            {user?.role === "SUPER_ADMIN" && (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleting(m)}
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" /> {t("common.delete")}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {t("common.page")} {page} {t("common.of")} {totalPages} · {total} {t("nav.members").toLowerCase()}
          </p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              {t("common.previous")}
            </Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
              {t("common.next")}
            </Button>
          </div>
        </div>
      )}

      {/* Form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t("members.editMember") : t("members.addNew")}</DialogTitle>
            <DialogDescription>
              {editing ? t("members.editing", { name: editing.fullName }) : t("members.addDesc")}
            </DialogDescription>
          </DialogHeader>
          <MemberForm
            member={editing}
            onSaved={() => { setShowForm(false); load(); }}
            onCancel={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("members.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("members.deleteConfirm", { name: deleting?.fullName ?? "", reg: deleting?.regNumber ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleting) return;
                try {
                  await api.delete(`/api/members/${deleting.id}`);
                  toast.success(t("members.memberDeleted"));
                  setDeleting(null);
                  load();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : t("members.deleteFailed"));
                }
              }}
            >
              {t("members.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MemberForm({ member, onSaved, onCancel }: { member: Member | null; onSaved: () => void; onCancel: () => void }) {
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: member?.fullName ?? "",
    regNumber: member?.regNumber ?? "",
    phoneNumber: member?.phoneNumber ?? "",
    email: member?.email ?? "",
    gender: member?.gender ?? "MALE",
    faculty: member?.faculty ?? "",
    department: member?.department ?? "",
    course: member?.course ?? "",
    yearOfStudy: member?.yearOfStudy ?? "YEAR_1",
    hostel: member?.hostel ?? "",
    homeRegion: member?.homeRegion ?? "",
    emergencyContact: member?.emergencyContact ?? "",
    biography: member?.biography ?? "",
    status: member?.status ?? "ACTIVE",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (member) {
        await api.put(`/api/members/${member.id}`, form);
        toast.success(t("members.memberUpdated"));
      } else {
        await api.post("/api/members", form);
        toast.success(t("members.memberCreated"));
      }
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("members.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label={t("members.fullName")} required>
          <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} required />
        </Field>
        <Field label={t("members.regNumber")} required>
          <Input value={form.regNumber} onChange={(e) => set("regNumber", e.target.value)} required />
        </Field>
        <Field label={t("members.phoneNumber")} required>
          <Input value={form.phoneNumber} onChange={(e) => set("phoneNumber", e.target.value)} required />
        </Field>
        <Field label={t("common.email")}>
          <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label={t("members.gender")} required>
          <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="MALE">{t("common.male")}</SelectItem>
              <SelectItem value="FEMALE">{t("common.female")}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label={t("members.yearOfStudy")} required>
          <Select value={form.yearOfStudy} onValueChange={(v) => set("yearOfStudy", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.keys(LABELS.year).map((v) => <SelectItem key={v} value={v}>{label(t, "year", v)}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t("members.faculty")} required>
          <Input value={form.faculty} onChange={(e) => set("faculty", e.target.value)} required />
        </Field>
        <Field label={t("members.department")} required>
          <Input value={form.department} onChange={(e) => set("department", e.target.value)} required />
        </Field>
        <Field label={t("members.course")} required>
          <Input value={form.course} onChange={(e) => set("course", e.target.value)} required />
        </Field>
        <Field label={t("members.hostel")}>
          <Input value={form.hostel} onChange={(e) => set("hostel", e.target.value)} />
        </Field>
        <Field label={t("members.homeRegion")}>
          <Input value={form.homeRegion} onChange={(e) => set("homeRegion", e.target.value)} />
        </Field>
        <Field label={t("members.emergencyContact")}>
          <Input value={form.emergencyContact} onChange={(e) => set("emergencyContact", e.target.value)} />
        </Field>
        <Field label={t("common.status")}>
          <Select value={form.status} onValueChange={(v) => set("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.keys(LABELS.status).map((v) => <SelectItem key={v} value={v}>{label(t, "status", v)}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label={t("members.biography")}>
        <textarea
          className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={form.biography}
          onChange={(e) => set("biography", e.target.value)}
          rows={3}
        />
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>{t("common.cancel")}</Button>
        <Button type="submit" disabled={saving}>{saving ? t("common.saving") : member ? t("members.updateMember") : t("members.createMember")}</Button>
      </DialogFooter>
    </form>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}{required && <span className="text-destructive ml-0.5">*</span>}</Label>
      {children}
    </div>
  );
}
