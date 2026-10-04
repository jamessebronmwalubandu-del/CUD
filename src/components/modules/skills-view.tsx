"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Award, Plus, Search, CheckCircle2, XCircle, Trash2, LayoutGrid, Clock, MessageSquare,
} from "lucide-react";
import { api, formatDate, initials, label, LABELS, timeAgo } from "@/lib/utils/client";
import type { MemberSkill, Skill } from "@/types";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { toast } from "sonner";

export function SkillsView() {
  const { t, locale } = useI18n();
  const { user, member } = useAuth();
  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";

  const [mySkills, setMySkills] = useState<MemberSkill[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [pending, setPending] = useState<MemberSkill[]>([]);
  const [recent, setRecent] = useState<MemberSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequest, setShowRequest] = useState(false);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<Skill | null>(null);
  const [showCreateSkill, setShowCreateSkill] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [mine, all, pend] = await Promise.all([
        member?.id
          ? api.get<{ items: MemberSkill[] }>(`/api/member-skills?memberId=${member.id}`)
          : Promise.resolve({ items: [] as MemberSkill[] }),
        api.get<{ items: Skill[] }>("/api/skills"),
        isAdmin
          ? api.get<{ items: MemberSkill[] }>("/api/member-skills?status=PENDING")
          : Promise.resolve({ items: [] as MemberSkill[] }),
      ]);
      setMySkills(mine.items ?? []);
      setAllSkills(all.items ?? []);
      setPending(pend.items ?? []);
      if (isAdmin) {
        try {
          const rec = await api.get<{ items: MemberSkill[] }>(`/api/member-skills`);
          setRecent(
            (rec.items ?? [])
              .filter((m) => m.status !== "PENDING")
              .sort((a, b) => (b.reviewedAt ?? b.requestedAt).localeCompare(a.reviewedAt ?? a.requestedAt))
              .slice(0, 10),
          );
        } catch { /* noop */ }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("skills.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [member?.id, isAdmin]);

  const filteredSkills = useMemo(
    () => allSkills.filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase())),
    [allSkills, search],
  );

  const mySkillIds = useMemo(() => new Set(mySkills.map((s) => s.skillId)), [mySkills]);
  const available = useMemo(() => allSkills.filter((s) => !mySkillIds.has(s.id)), [allSkills, mySkillIds]);

  const grouped = useMemo(() => {
    const map = new Map<string, Skill[]>();
    for (const s of filteredSkills) {
      const k = s.category || t("skills.uncategorised");
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredSkills, t]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-serif tracking-tight flex items-center gap-2">
            <Award className="h-6 w-6 text-primary" /> {t("skills.title")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("skills.subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCreateSkill(true)} className={isAdmin ? "" : "hidden"}>
            <Plus className="mr-1.5 h-4 w-4" /> {t("skills.newSkill")}
          </Button>
          <Button onClick={() => setShowRequest(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> {t("skills.requestNewSkill")}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="mine">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 max-w-xl">
          <TabsTrigger value="mine">{t("skills.mySkills")}</TabsTrigger>
          {isAdmin && <TabsTrigger value="pending">{t("skills.pendingApprovals")}</TabsTrigger>}
          {isAdmin && <TabsTrigger value="catalogue">{t("skills.catalogue")}</TabsTrigger>}
        </TabsList>

        {/* My Skills tab */}
        <TabsContent value="mine" className="mt-4">
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
          ) : mySkills.length === 0 ? (
            <EmptyState
              icon={Award}
              title={t("skills.noSkills").split(".")[0]}
              description={t("skills.requestFirst")}
              action={<Button onClick={() => setShowRequest(true)}><Plus className="mr-1.5 h-4 w-4" /> {t("skills.requestNewSkill")}</Button>}
            />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {mySkills.map((ms) => (
                <SkillCard key={ms.id} ms={ms} onChanged={load} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Pending Approvals tab */}
        {isAdmin && (
          <TabsContent value="pending" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("skills.pendingTitle")}</CardTitle>
                <CardDescription>{t("skills.awaitingReview", { n: pending.length })}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : pending.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-emerald-500/60" />
                    {t("skills.allCaughtUp")}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("nav.members")}</TableHead>
                          <TableHead>{t("skills.title")}</TableHead>
                          <TableHead className="hidden md:table-cell">{t("skills.requested")}</TableHead>
                          <TableHead className="text-right">{t("common.actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pending.map((ms) => (
                          <PendingRow key={ms.id} ms={ms} onChanged={load} />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {recent.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("skills.recentlyReviewed")}</CardTitle>
                  <CardDescription>{t("skills.recentDecisions", { n: recent.length })}</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {recent.map((ms) => (
                      <div key={ms.id} className="flex items-center gap-3 p-3 text-sm">
                        <div className="shrink-0">
                          {ms.status === "APPROVED"
                            ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            : <XCircle className="h-5 w-5 text-rose-500" />}
                        </div>
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="bg-primary/15 text-primary text-[10px]">
                            {initials(ms.member?.fullName ?? "?")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">
                            {ms.member?.fullName ?? t("common.none")} · <span className="text-muted-foreground">{ms.skill?.name}</span>
                          </p>
                          {ms.reviewerNote && (
                            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" /> {ms.reviewerNote}
                            </p>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground shrink-0">{timeAgo(ms.reviewedAt ?? ms.requestedAt, locale)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* Catalogue tab */}
        {isAdmin && (
          <TabsContent value="catalogue" className="mt-4 space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("skills.searchPlaceholder")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </CardContent>
            </Card>

            {loading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
              </div>
            ) : grouped.length === 0 ? (
              <EmptyState icon={LayoutGrid} title={t("skills.noCatalogue")} description={t("skills.createFirst")} />
            ) : (
              grouped.map(([category, skills]) => (
                <Card key={category}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-primary" /> {category}
                      <Badge variant="secondary" className="text-[10px]">{skills.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {skills.map((s) => {
                        const memberCount = s._count?.members ?? 0;
                        return (
                          <div
                            key={s.id}
                            className="group rounded-lg border border-border/60 p-3 hover:border-primary/40 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{s.name}</p>
                                {s.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{s.description}</p>
                                )}
                                <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                                  <Award className="h-3 w-3" />
                                  {memberCount} {t("skills.members")}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                                onClick={() => setDeleting(s)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Request new skill dialog */}
      <Dialog open={showRequest} onOpenChange={setShowRequest}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("skills.requestNewSkill")}</DialogTitle>
            <DialogDescription>{t("skills.requestDialogDesc")}</DialogDescription>
          </DialogHeader>
          <RequestSkillForm
            available={available}
            onClose={() => setShowRequest(false)}
            onSaved={() => { setShowRequest(false); load(); }}
          />
        </DialogContent>
      </Dialog>

      {/* Create new skill dialog */}
      <Dialog open={showCreateSkill} onOpenChange={setShowCreateSkill}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("skills.createDialogTitle")}</DialogTitle>
            <DialogDescription>{t("skills.createDialogDesc")}</DialogDescription>
          </DialogHeader>
          <CreateSkillForm
            onClose={() => setShowCreateSkill(false)}
            onSaved={() => { setShowCreateSkill(false); load(); }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete skill dialog */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("skills.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("skills.deleteConfirm", { name: deleting?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleting) return;
                try {
                  await api.delete(`/api/skills/${deleting.id}`);
                  toast.success(t("skills.skillDeleted"));
                  setDeleting(null);
                  load();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : t("skills.deleteFailed"));
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

function SkillCard({ ms, onChanged }: { ms: MemberSkill; onChanged: () => void }) {
  const { t, locale } = useI18n();
  const statusTone = {
    PENDING: { cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
    APPROVED: { cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
    REJECTED: { cls: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
  }[ms.status];

  return (
    <Card className="card-hover">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold leading-tight truncate">{ms.skill?.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{ms.skill?.category ?? t("skills.uncategorised")}</p>
          </div>
          <Badge variant="outline" className={`text-[10px] ${statusTone.cls}`}>{label(t, "skillStatus", ms.status)}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">{t("skills.proficiency")}</p>
            <p className="font-medium">{ms.proficiency ? label(t, "proficiency", ms.proficiency) : "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {t("skills.requested")}</p>
            <p className="font-medium">{formatDate(ms.requestedAt, { month: "short", day: "numeric", year: "numeric" })}</p>
          </div>
        </div>
        {ms.reviewerNote && (
          <div className="rounded-md bg-muted/40 p-2 text-xs">
            <p className="text-muted-foreground flex items-center gap-1 mb-0.5"><MessageSquare className="h-3 w-3" /> {t("skills.reviewerNote")}</p>
            <p className="italic">{ms.reviewerNote}</p>
          </div>
        )}
        {ms.status === "PENDING" && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-destructive hover:text-destructive"
            onClick={async () => {
              try {
                await api.delete(`/api/member-skills/${ms.id}`);
                toast.success(t("skills.requestCancelled"));
                onChanged();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : t("skills.cancelFailed"));
              }
            }}
          >
            <XCircle className="mr-1.5 h-3.5 w-3.5" /> {t("skills.cancelRequest")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function PendingRow({ ms, onChanged }: { ms: MemberSkill; onChanged: () => void }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [note, setNote] = useState("");

  const approve = async () => {
    setBusy(true);
    try {
      await api.patch(`/api/member-skills/${ms.id}`, { status: "APPROVED" });
      toast.success(t("skills.approved"));
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("skills.approvalFailed"));
    } finally { setBusy(false); }
  };

  const reject = async () => {
    if (!note.trim()) { toast.error(t("skills.reasonRequired")); return; }
    setBusy(true);
    try {
      await api.patch(`/api/member-skills/${ms.id}`, { status: "REJECTED", reviewerNote: note.trim() });
      toast.success(t("skills.rejected"));
      onChanged();
      setRejectMode(false);
      setNote("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("skills.rejectionFailed"));
    } finally { setBusy(false); }
  };

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2.5">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="bg-primary/15 text-primary text-xs font-medium">
              {initials(ms.member?.fullName ?? "?")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{ms.member?.fullName ?? t("common.none")}</p>
            <p className="text-xs text-muted-foreground truncate font-mono">{ms.member?.regNumber}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div>
          <p className="font-medium text-sm">{ms.skill?.name}</p>
          <p className="text-xs text-muted-foreground">{ms.skill?.category ?? t("skills.uncategorised")}</p>
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
        {formatDate(ms.requestedAt, { month: "short", day: "numeric", year: "numeric" })}
      </TableCell>
      <TableCell className="text-right">
        {rejectMode ? (
          <div className="flex items-center gap-2 justify-end">
            <Input
              placeholder={t("skills.reasonPlaceholder")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-8 w-40 text-xs"
              autoFocus
            />
            <Button size="sm" variant="destructive" disabled={busy} onClick={reject}>{t("common.confirm")}</Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => { setRejectMode(false); setNote(""); }}>{t("common.cancel")}</Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 justify-end">
            <Button size="sm" variant="outline" disabled={busy} onClick={approve} className="text-emerald-600 hover:text-emerald-700">
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> {t("common.approve")}
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setRejectMode(true)} className="text-rose-600 hover:text-rose-700">
              <XCircle className="mr-1 h-3.5 w-3.5" /> {t("common.reject")}
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

function RequestSkillForm({
  available, onClose, onSaved,
}: { available: Skill[]; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string>("");
  const [proficiency, setProficiency] = useState("BEGINNER");
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(
    () => available.filter((s) => !query || s.name.toLowerCase().includes(query.toLowerCase())).slice(0, 50),
    [available, query],
  );

  const submit = async () => {
    if (!selected) { toast.error(t("skills.pickSkill")); return; }
    setSaving(true);
    try {
      await api.post("/api/member-skills", { skillId: selected, proficiency });
      toast.success(t("skills.skillRequested"));
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("skills.requestFailed"));
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("skills.searchCatalogue")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
          autoFocus
        />
      </div>
      <ScrollArea className="h-56 rounded-md border">
        <div className="p-1">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {available.length === 0 ? t("skills.allRequested") : t("skills.noMatching")}
            </p>
          ) : (
            filtered.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelected(s.id)}
                className={`w-full text-left rounded-md px-3 py-2 text-sm transition-colors flex items-center justify-between gap-2 ${
                  selected === s.id ? "bg-primary/10 text-primary" : "hover:bg-accent"
                }`}
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.category ?? t("skills.uncategorised")}</p>
                </div>
                {selected === s.id && <CheckCircle2 className="h-4 w-4 shrink-0" />}
              </button>
            ))
          )}
        </div>
      </ScrollArea>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">{t("skills.proficiencyOptional")}</Label>
        <Select value={proficiency} onValueChange={setProficiency}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.keys(LABELS.proficiency).map((v) => <SelectItem key={v} value={v}>{label(t, "proficiency", v)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>{t("common.cancel")}</Button>
        <Button type="button" onClick={submit} disabled={saving || !selected}>
          {saving ? t("skills.requesting") : t("skills.submitRequest")}
        </Button>
      </DialogFooter>
    </div>
  );
}

function CreateSkillForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error(t("validation.required", { field: t("skills.skillName") })); return; }
    setSaving(true);
    try {
      await api.post("/api/skills", { name: name.trim(), category: category.trim() || null, description: description.trim() || null });
      toast.success(t("skills.skillCreated"));
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("skills.createFailed"));
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">{t("skills.skillName")} <span className="text-destructive">*</span></Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("skills.skillNamePlaceholder")} required autoFocus />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">{t("skills.category")}</Label>
        <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder={t("skills.categoryPlaceholder")} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">{t("common.description")}</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder={t("skills.descriptionPlaceholder")} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>{t("common.cancel")}</Button>
        <Button type="submit" disabled={saving}>{saving ? t("skills.creating") : t("skills.createSkill")}</Button>
      </DialogFooter>
    </form>
  );
}

function EmptyState({
  icon: Icon, title, description, action,
}: { icon: React.ComponentType<{ className?: string }>; title: string; description: string; action?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <Icon className="h-12 w-12 mx-auto text-muted-foreground/50" />
        <p className="mt-3 font-medium">{title}</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{description}</p>
        {action && <div className="mt-4">{action}</div>}
      </CardContent>
    </Card>
  );
}
