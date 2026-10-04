"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Building2, Plus, Pencil, Trash2, Search, Users, FileText, CalendarCheck, Megaphone, Crown, UserCog,
} from "lucide-react";
import { api, initials, label, LABELS, timeAgo } from "@/lib/utils/client";
import type { Ministry, Member, MinistryRole } from "@/types";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { toast } from "sonner";

type MinistryList = Ministry & {
  leader?: Member | null;
  assistantLeader?: Member | null;
  members?: { id: string; memberId: string; role: MinistryRole; member: Member }[];
  _count?: { documents: number; attendanceSessions: number; announcements: number };
};

export function MinistriesView() {
  const { t } = useI18n();
  const { user } = useAuth();
  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";
  const [ministries, setMinistries] = useState<MinistryList[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MinistryList | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MinistryList | null>(null);
  const [deleting, setDeleting] = useState<MinistryList | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const d = await api.get<{ items: MinistryList[] }>("/api/ministries");
      setMinistries(d.items ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("ministries.loadFailed"));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openDetail = async (m: MinistryList) => {
    try {
      const full = await api.get<MinistryList>(`/api/ministries/${m.id}`);
      setSelected(full);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("ministries.openFailed"));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-serif tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" /> {t("ministries.title")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("ministries.subtitle", { total: ministries.length })}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="mr-1.5 h-4 w-4" /> {t("ministries.addMinistry")}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
        </div>
      ) : ministries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="mt-3 font-medium">{t("ministries.noMinistries")}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {isAdmin ? t("ministries.createFirst") : t("ministries.checkBack")}
            </p>
            {isAdmin && (
              <Button className="mt-4" onClick={() => { setEditing(null); setShowForm(true); }}>
                <Plus className="mr-1.5 h-4 w-4" /> {t("ministries.createMinistry")}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ministries.map((m) => (
            <MinistryCard key={m.id} ministry={m} isAdmin={isAdmin} onOpen={() => openDetail(m)} onEdit={() => { setEditing(m); setShowForm(true); }} onDelete={() => setDeleting(m)} />
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selected && <MinistryDetail ministry={selected} isAdmin={isAdmin} onChanged={load} onClose={() => setSelected(null)} onRefresh={async () => {
            try {
              const full = await api.get<MinistryList>(`/api/ministries/${selected.id}`);
              setSelected(full);
            } catch { /* noop */ }
          }} />}
        </DialogContent>
      </Dialog>

      {/* Form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? t("ministries.editMinistry") : t("ministries.addMinistry")}</DialogTitle>
            <DialogDescription>
              {editing ? t("ministries.editing", { name: editing.name }) : t("ministries.addDesc")}
            </DialogDescription>
          </DialogHeader>
          <MinistryForm
            ministry={editing}
            onSaved={() => { setShowForm(false); load(); }}
            onCancel={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("ministries.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("ministries.deleteConfirmMsg", { name: deleting?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleting) return;
                try {
                  await api.delete(`/api/ministries/${deleting.id}`);
                  toast.success(t("ministries.ministryDeleted"));
                  setDeleting(null);
                  load();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : t("ministries.deleteFailed"));
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

function MinistryCard({
  ministry, isAdmin, onOpen, onEdit, onDelete,
}: {
  ministry: MinistryList; isAdmin: boolean; onOpen: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const { t } = useI18n();
  const color = ministry.color ?? "#0f766e";
  return (
    <Card className="card-hover overflow-hidden group">
      <div className="h-1.5" style={{ backgroundColor: color }} />
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <button onClick={onOpen} className="text-left min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: color }} />
              <p className="font-serif font-semibold text-lg leading-tight truncate">{ministry.name}</p>
            </div>
            {ministry.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{ministry.description}</p>
            )}
          </button>
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0">⋯</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}><Pencil className="mr-2 h-3.5 w-3.5" /> {t("common.edit")}</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> {t("common.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-500 shrink-0" />
            <span className="text-xs text-muted-foreground w-20">{t("ministries.leader")}</span>
            <span className="font-medium truncate">{ministry.leader?.fullName ?? "—"}</span>
          </div>
          <div className="flex items-center gap-2">
            <UserCog className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground w-20">{t("ministries.assistant")}</span>
            <span className="font-medium truncate">{ministry.assistantLeader?.fullName ?? "—"}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          <Stat icon={Users} value={ministry.members?.length ?? 0} label={t("ministries.members")} />
          <Stat icon={FileText} value={ministry._count?.documents ?? 0} label={t("ministries.documents")} />
          <Stat icon={CalendarCheck} value={ministry._count?.attendanceSessions ?? 0} label={t("ministries.sessions")} />
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ icon: Icon, value, label }: { icon: React.ComponentType<{ className?: string }>; value: number; label: string }) {
  return (
    <div className="text-center">
      <Icon className="h-4 w-4 mx-auto text-muted-foreground" />
      <p className="font-semibold text-base leading-none mt-1">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function MinistryDetail({
  ministry, isAdmin, onChanged, onClose, onRefresh,
}: {
  ministry: MinistryList; isAdmin: boolean; onChanged: () => void; onClose: () => void; onRefresh: () => Promise<void>;
}) {
  const { t, locale } = useI18n();
  const color = ministry.color ?? "#0f766e";
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [searching, setSearching] = useState(false);

  const members = ministry.members ?? [];

  const doSearch = async (q: string) => {
    setSearch(q);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const d = await api.get<{ items: Member[] }>(`/api/members/search?q=${encodeURIComponent(q)}&limit=20`);
      const existingIds = new Set(members.map((m) => m.memberId));
      setSearchResults((d.items ?? []).filter((m) => !existingIds.has(m.id)));
    } catch { /* noop */ }
    finally { setSearching(false); }
  };

  const addMember = async (memberId: string) => {
    try {
      await api.post(`/api/ministries/${ministry.id}`, { memberId, role: "MEMBER" });
      toast.success(t("ministries.memberAdded"));
      setSearch("");
      setSearchResults([]);
      onRefresh();
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("ministries.addFailed"));
    }
  };

  const changeRole = async (memberId: string, role: MinistryRole) => {
    try {
      await api.patch(`/api/ministries/${ministry.id}/members/${memberId}`, { role });
      toast.success(t("ministries.roleChanged"));
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("ministries.updateFailed"));
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      await api.delete(`/api/ministries/${ministry.id}/members/${memberId}`);
      toast.success(t("ministries.memberRemoved"));
      onRefresh();
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("ministries.removeFailed"));
    }
  };

  return (
    <div className="space-y-5">
      <DialogHeader>
        <div className="flex items-center gap-3">
          <span className="h-4 w-4 rounded-sm" style={{ backgroundColor: color }} />
          <DialogTitle className="font-serif text-xl">{ministry.name}</DialogTitle>
        </div>
        <DialogDescription>{ministry.description ?? t("ministries.noDescription")}</DialogDescription>
      </DialogHeader>

      <div className="grid sm:grid-cols-3 gap-3">
        <DetailStat label={t("ministries.leader")} value={ministry.leader?.fullName ?? "—"} icon={Crown} />
        <DetailStat label={t("ministries.assistant")} value={ministry.assistantLeader?.fullName ?? "—"} icon={UserCog} />
        <DetailStat label={t("ministries.sessionsHeld")} value={String(ministry._count?.attendanceSessions ?? 0)} icon={CalendarCheck} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> {t("ministries.memberRoster", { n: members.length })}</p>
          {isAdmin && (
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={t("ministries.searchToAdd")}
                value={search}
                onChange={(e) => doSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          )}
        </div>

        {search && searchResults.length > 0 && (
          <div className="rounded-md border bg-popover p-1 max-h-44 overflow-y-auto">
            {searchResults.map((m) => (
              <button
                key={m.id}
                onClick={() => addMember(m.id)}
                className="w-full text-left rounded px-2 py-1.5 hover:bg-accent text-sm flex items-center gap-2"
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="bg-primary/15 text-primary text-[10px]">{initials(m.fullName)}</AvatarFallback>
                </Avatar>
                <span className="flex-1 truncate">{m.fullName}</span>
                <span className="text-xs text-muted-foreground">{m.regNumber}</span>
                <Plus className="h-3.5 w-3.5 text-primary" />
              </button>
            ))}
          </div>
        )}

        {searching && <p className="text-xs text-muted-foreground text-center">{t("ministries.searching")}</p>}

        {members.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6 rounded-md border border-dashed">
            {t("ministries.noMembersYet")}
          </div>
        ) : (
          <div className="rounded-md border divide-y max-h-72 overflow-y-auto">
            {members.map((mm) => (
              <div key={mm.id} className="flex items-center gap-3 p-2.5">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className="bg-primary/15 text-primary text-xs">{initials(mm.member.fullName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{mm.member.fullName}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">{mm.member.regNumber}</p>
                </div>
                <RoleBadge role={mm.role} />
                {isAdmin ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">{t("ministries.role")} ⌄</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {Object.keys(LABELS.ministryRole).map((v) => (
                        <DropdownMenuItem key={v} onClick={() => changeRole(mm.memberId, v as MinistryRole)} disabled={v === mm.role}>
                          {label(t, "ministryRole", v)}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => removeMember(mm.memberId)}>
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> {t("common.remove")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {ministry.announcements && ministry.announcements.length > 0 && (
        <div className="space-y-2">
          <p className="font-medium text-sm flex items-center gap-2"><Megaphone className="h-4 w-4 text-primary" /> {t("ministries.recentAnnouncements")}</p>
          <div className="space-y-2 max-h-44 overflow-y-auto">
            {ministry.announcements.slice(0, 5).map((a) => (
              <div key={a.id} className="rounded-md border border-border/60 p-2.5 text-sm">
                <p className="font-medium truncate">{a.pinned && "📌 "}{a.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{a.content}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(a.createdAt, locale)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>{t("common.close")}</Button>
      </DialogFooter>
    </div>
  );
}

function DetailStat({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="font-medium text-sm mt-1 truncate">{value}</p>
    </div>
  );
}

function RoleBadge({ role }: { role: MinistryRole }) {
  const { t } = useI18n();
  const cls = {
    LEADER: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    ASSISTANT: "bg-primary/10 text-primary border-primary/20",
    MEMBER: "bg-muted text-muted-foreground",
  }[role];
  return <Badge variant="outline" className={`text-[10px] ${cls}`}>{label(t, "ministryRole", role)}</Badge>;
}

function MinistryForm({ ministry, onSaved, onCancel }: { ministry: MinistryList | null; onSaved: () => void; onCancel: () => void }) {
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: ministry?.name ?? "",
    description: ministry?.description ?? "",
    color: ministry?.color ?? "#0f766e",
    leaderId: ministry?.leaderId ?? "",
    assistantLeaderId: ministry?.assistantLeaderId ?? "",
  });
  const [leaderSearch, setLeaderSearch] = useState("");
  const [leaderResults, setLeaderResults] = useState<Member[]>([]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const searchLeader = async (q: string, target: "leaderId" | "assistantLeaderId") => {
    if (target === "leaderId") setLeaderSearch(q);
    if (q.trim().length < 2) { setLeaderResults([]); return; }
    try {
      const d = await api.get<{ items: Member[] }>(`/api/members/search?q=${encodeURIComponent(q)}&limit=10`);
      setLeaderResults(d.items ?? []);
    } catch { /* noop */ }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error(t("ministries.nameRequired")); return; }
    setSaving(true);
    try {
      const payload = { ...form, leaderId: form.leaderId || null, assistantLeaderId: form.assistantLeaderId || null };
      if (ministry) {
        await api.put(`/api/ministries/${ministry.id}`, payload);
        toast.success(t("ministries.ministryUpdated"));
      } else {
        await api.post("/api/ministries", payload);
        toast.success(t("ministries.ministryCreated"));
      }
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("ministries.saveFailed"));
    } finally { setSaving(false); }
  };

  const colorPresets = ["#0f766e", "#92400e", "#9d174d", "#4c1d95", "#065f46", "#9a3412", "#115e59", "#854d0e"];

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">{t("ministries.ministryName")} <span className="text-destructive">*</span></Label>
        <Input value={form.name} onChange={(e) => set("name", e.target.value)} required autoFocus />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">{t("ministries.ministryDesc")}</Label>
        <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">{t("ministries.color")}</Label>
        <div className="flex items-center gap-2 flex-wrap">
          {colorPresets.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => set("color", c)}
              className={`h-7 w-7 rounded-full border-2 ${form.color === c ? "border-foreground" : "border-transparent"}`}
              style={{ backgroundColor: c }}
              aria-label={`${t("ministries.color")} ${c}`}
            />
          ))}
          <input
            type="color"
            value={form.color}
            onChange={(e) => set("color", e.target.value)}
            className="h-7 w-10 rounded cursor-pointer bg-transparent border"
          />
        </div>
      </div>

      <LeaderPicker
        label={t("ministries.leader")}
        search={leaderSearch}
        onSearch={(q) => searchLeader(q, "leaderId")}
        results={leaderResults}
        selectedId={form.leaderId}
        existingMember={ministry?.leader}
        onPick={(id) => { set("leaderId", id); setLeaderSearch(""); setLeaderResults([]); }}
        onClear={() => set("leaderId", "")}
      />

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>{t("common.cancel")}</Button>
        <Button type="submit" disabled={saving}>{saving ? t("common.saving") : ministry ? t("ministries.updateMinistry") : t("ministries.createMinistry")}</Button>
      </DialogFooter>
    </form>
  );
}

function LeaderPicker({
  label, search, onSearch, results, selectedId, existingMember, onPick, onClear,
}: {
  label: string;
  search: string;
  onSearch: (q: string) => void;
  results: Member[];
  selectedId: string;
  existingMember?: Member | null;
  onPick: (id: string) => void;
  onClear: () => void;
}) {
  const { t } = useI18n();
  const chosen = selectedId ? results.find((m) => m.id === selectedId) ?? existingMember : null;
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {chosen ? (
        <div className="flex items-center gap-2 rounded-md border p-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-primary/15 text-primary text-[10px]">{initials(chosen.fullName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{chosen.fullName}</p>
            <p className="text-xs text-muted-foreground font-mono truncate">{chosen.regNumber}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" className="h-7" onClick={onClear}>{t("ministries.change")}</Button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => onSearch(e.target.value)} placeholder={t("ministries.searchMembers")} className="pl-9 text-sm" />
          {results.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover p-1 max-h-44 overflow-y-auto shadow-md">
              {results.map((m) => (
                <button key={m.id} type="button" onClick={() => onPick(m.id)} className="w-full text-left rounded px-2 py-1.5 hover:bg-accent text-sm flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-primary/15 text-primary text-[10px]">{initials(m.fullName)}</AvatarFallback>
                  </Avatar>
                  <span className="flex-1 truncate">{m.fullName}</span>
                  <span className="text-xs text-muted-foreground">{m.regNumber}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
