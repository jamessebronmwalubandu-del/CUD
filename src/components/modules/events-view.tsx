"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CalendarDays, Plus, MapPin, Clock, Users, Pencil, Trash2, Eye, UserPlus, UserMinus,
} from "lucide-react";
import { api, formatDate, formatDateTime, initials, label, LABELS } from "@/lib/utils/client";
import type { Event, EventStatus, Ministry } from "@/types";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { toast } from "sonner";

const STATUS_TONES: Record<EventStatus, string> = {
  UPCOMING: "bg-primary/10 text-primary",
  ONGOING: "bg-amber-500/10 text-amber-600",
  COMPLETED: "bg-emerald-500/10 text-emerald-600",
  CANCELLED: "bg-rose-500/10 text-rose-600",
};

type EventItem = Event & { _count?: { registrations: number }; registered?: boolean };

export function EventsView() {
  const { t } = useI18n();
  const { user, member } = useAuth();
  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [viewing, setViewing] = useState<EventItem | null>(null);
  const [deleting, setDeleting] = useState<EventItem | null>(null);
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    try {
      const d = await api.get<{ items: EventItem[] }>("/api/events");
      setEvents(d.items ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("events.loadFailed"));
    } finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    // Check registration status for each event by loading detail (lightweight)
    api.get<{ items: EventItem[] }>("/api/events").then(async (d) => {
      const set = new Set<string>();
      for (const e of d.items ?? []) {
        try {
          const detail = await api.get<Event & { registrations?: { memberId: string }[] }>(`/api/events/${e.id}`);
          if (detail.registrations?.some((r) => r.memberId === member?.id)) set.add(e.id);
        } catch { /* noop */ }
      }
      setRegisteredIds(set);
    }).catch(() => {});
  }, [member?.id]);

  const upcoming = useMemo(() => events.filter((e) => e.status === "UPCOMING" || e.status === "ONGOING").sort((a, b) => a.startDate.localeCompare(b.startDate)), [events]);
  const past = useMemo(() => events.filter((e) => e.status === "COMPLETED" || e.status === "CANCELLED").sort((a, b) => b.startDate.localeCompare(a.startDate)), [events]);

  const toggleRegister = async (e: EventItem) => {
    try {
      const r = await api.post<{ registered: boolean }>(`/api/events/${e.id}`);
      setRegisteredIds((prev) => {
        const next = new Set(prev);
        if (r.registered) next.add(e.id); else next.delete(e.id);
        return next;
      });
      toast.success(r.registered ? t("events.registeredSuccess") : t("events.unregisteredSuccess"));
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("events.registrationFailed"));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-serif tracking-tight flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" /> {t("events.title")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("events.subtitle", { total: events.length })}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="mr-1.5 h-4 w-4" /> {t("events.createEvent")}
          </Button>
        )}
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">{t("events.upcoming")} ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">{t("events.past")} ({past.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4">
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
            </div>
          ) : upcoming.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="mt-3 font-medium">{t("events.noUpcoming")}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isAdmin ? t("events.createFirst") : t("events.checkBack")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcoming.map((e) => (
                <EventCard
                  key={e.id}
                  event={e}
                  isAdmin={isAdmin}
                  registered={registeredIds.has(e.id)}
                  onToggle={() => toggleRegister(e)}
                  onView={() => setViewing(e)}
                  onEdit={() => { setEditing(e); setShowForm(true); }}
                  onDelete={() => setDeleting(e)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : past.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                {t("events.noPast")}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {past.map((e) => (
                    <div key={e.id} className="flex items-center gap-3 p-4">
                      <div className="text-center shrink-0 w-12">
                        <p className="text-[10px] uppercase text-muted-foreground">
                          {new Date(e.startDate).toLocaleDateString(undefined, { month: "short" })}
                        </p>
                        <p className="text-lg font-semibold leading-none">{new Date(e.startDate).getDate()}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{e.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{e.location ?? t("events.noLocation")}</p>
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${STATUS_TONES[e.status]}`}>{label(t, "eventStatus", e.status)}</Badge>
                      <Badge variant="outline" className="text-[10px]">
                        <Users className="h-3 w-3 mr-0.5" /> {e._count?.registrations ?? 0}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => setViewing(e)}><Eye className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t("events.editEvent") : t("events.createEvent")}</DialogTitle>
            <DialogDescription>
              {editing ? t("events.editing", { title: editing.title }) : t("events.createDesc")}
            </DialogDescription>
          </DialogHeader>
          <EventForm event={editing} onSaved={() => { setShowForm(false); load(); }} onCancel={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>

      {/* View dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {viewing && <EventDetail event={viewing} />}
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("events.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("events.deleteConfirmMsg", { title: deleting?.title ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleting) return;
                try {
                  await api.delete(`/api/events/${deleting.id}`);
                  toast.success(t("events.eventDeleted"));
                  setDeleting(null);
                  load();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : t("events.deleteFailed"));
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

function EventCard({
  event: e, isAdmin, registered, onToggle, onView, onEdit, onDelete,
}: {
  event: EventItem; isAdmin: boolean; registered: boolean;
  onToggle: () => void; onView: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const { t } = useI18n();
  const date = new Date(e.startDate);
  const regCount = e._count?.registrations ?? 0;
  const fillRate = e.capacity ? (regCount / e.capacity) * 100 : 0;
  const seatsLeft = e.capacity ? e.capacity - regCount : null;

  return (
    <Card className="card-hover group">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="text-center shrink-0 w-14 rounded-lg border bg-muted/40 p-2">
            <p className="text-[10px] uppercase text-muted-foreground">{date.toLocaleDateString(undefined, { month: "short" })}</p>
            <p className="text-2xl font-serif font-semibold leading-none">{date.getDate()}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{date.toLocaleDateString(undefined, { weekday: "short" })}</p>
          </div>
          <div className="min-w-0 flex-1">
            <button onClick={onView} className="text-left w-full">
              <p className="font-serif font-semibold leading-tight truncate">{e.title}</p>
              {e.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{e.description}</p>}
            </button>
          </div>
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0">⋯</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}><Pencil className="mr-2 h-3.5 w-3.5" /> {t("common.edit")}</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}><Trash2 className="mr-2 h-3.5 w-3.5" /> {t("common.delete")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span>
          {e.location && <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3" />{e.location}</span>}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`text-[10px] ${STATUS_TONES[e.status]}`}>{label(t, "eventStatus", e.status)}</Badge>
          {e.capacity && (
            <Badge variant="outline" className="text-[10px]">{t("dashboard.registered", { count: regCount, capacity: e.capacity })}</Badge>
          )}
          {!e.capacity && regCount > 0 && (
            <Badge variant="outline" className="text-[10px]"><Users className="h-3 w-3 mr-0.5" />{regCount}</Badge>
          )}
        </div>

        {e.capacity && (
          <div>
            <Progress value={fillRate} className="h-1.5" />
            <p className="text-[10px] text-muted-foreground mt-1">
              {seatsLeft !== null && seatsLeft > 0 ? t("events.seatsLeft", { n: seatsLeft }) : t("events.fullyBooked")}
            </p>
          </div>
        )}

        <Button
          variant={registered ? "outline" : "default"}
          size="sm"
          className="w-full"
          onClick={onToggle}
          disabled={e.status === "CANCELLED"}
        >
          {registered ? <><UserMinus className="mr-1.5 h-3.5 w-3.5" /> {t("events.unregister")}</> : <><UserPlus className="mr-1.5 h-3.5 w-3.5" /> {t("events.register")}</>}
        </Button>
      </CardContent>
    </Card>
  );
}

function EventForm({ event, onSaved, onCancel }: { event: EventItem | null; onSaved: () => void; onCancel: () => void }) {
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [form, setForm] = useState({
    title: event?.title ?? "",
    description: event?.description ?? "",
    location: event?.location ?? "",
    startDate: event ? toLocalDatetime(event.startDate) : "",
    endDate: event?.endDate ? toLocalDatetime(event.endDate) : "",
    capacity: event?.capacity?.toString() ?? "",
    ministryId: event?.ministryId ?? "",
    status: event?.status ?? "UPCOMING",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    api.get<{ items: Ministry[] }>("/api/ministries").then((d) => setMinistries(d.items ?? [])).catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.startDate) { toast.error(t("events.titleStartRequired")); return; }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        location: form.location.trim() || null,
        startDate: new Date(form.startDate).toISOString(),
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
        capacity: form.capacity ? Number(form.capacity) : null,
        ministryId: form.ministryId || null,
        status: form.status,
      };
      if (event) {
        await api.put(`/api/events/${event.id}`, payload);
        toast.success(t("events.eventUpdated"));
      } else {
        await api.post("/api/events", payload);
        toast.success(t("events.eventCreated"));
      }
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("events.saveFailed"));
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">{t("events.eventTitle")} <span className="text-destructive">*</span></Label>
        <Input value={form.title} onChange={(e) => set("title", e.target.value)} required autoFocus />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">{t("events.eventDesc")}</Label>
        <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">{t("common.location")}</Label>
          <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder={t("events.locationPlaceholder")} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">{t("events.capacity")}</Label>
          <Input type="number" min="1" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} placeholder={t("common.optional")} />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">{t("events.startLabel")} <span className="text-destructive">*</span></Label>
          <Input type="datetime-local" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">{t("events.endLabel")}</Label>
          <Input type="datetime-local" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">{t("nav.ministries")}</Label>
          <Select value={form.ministryId || "NONE"} onValueChange={(v) => set("ministryId", v === "NONE" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder={t("documents.noneChapterWide")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">{t("documents.noneChapterWide")}</SelectItem>
              {ministries.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">{t("events.status")}</Label>
          <Select value={form.status} onValueChange={(v) => set("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.keys(LABELS.eventStatus).map((v) => <SelectItem key={v} value={v}>{label(t, "eventStatus", v)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>{t("common.cancel")}</Button>
        <Button type="submit" disabled={saving}>{saving ? t("common.saving") : event ? t("events.editEvent") : t("events.createEvent")}</Button>
      </DialogFooter>
    </form>
  );
}

function EventDetail({ event }: { event: EventItem }) {
  const { t } = useI18n();
  const [detail, setDetail] = useState<Event & { registrations?: { id: string; memberId: string; registeredAt: string; member: { id: string; fullName: string; regNumber: string } }[]; organizer?: { fullName: string; regNumber: string } | null } | null>(null);

  useEffect(() => {
    api.get<Event & { registrations?: { id: string; memberId: string; registeredAt: string; member: { id: string; fullName: string; regNumber: string } }[]; organizer?: { fullName: string; regNumber: string } | null }>(`/api/events/${event.id}`)
      .then(setDetail)
      .catch((err) => toast.error(err instanceof Error ? err.message : t("events.loadFailed")));
  }, [event.id, t]);

  if (!detail) {
    return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }

  const regCount = detail.registrations?.length ?? 0;
  const fillRate = detail.capacity ? (regCount / detail.capacity) * 100 : 0;

  return (
    <div className="space-y-4">
      <DialogHeader>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`text-[10px] ${STATUS_TONES[detail.status]}`}>{label(t, "eventStatus", detail.status)}</Badge>
          {detail.capacity && <Badge variant="outline" className="text-[10px]">{regCount}/{detail.capacity}</Badge>}
        </div>
        <DialogTitle className="font-serif text-xl">{detail.title}</DialogTitle>
        <DialogDescription>
          {formatDateTime(detail.startDate)}
          {detail.endDate ? ` → ${formatDateTime(detail.endDate)}` : ""}
        </DialogDescription>
      </DialogHeader>

      {detail.description && (
        <p className="text-sm text-muted-foreground">{detail.description}</p>
      )}

      <div className="grid sm:grid-cols-3 gap-3">
        <DetailStat icon={MapPin} label={t("common.location")} value={detail.location ?? t("events.tbd")} />
        <DetailStat icon={Clock} label={t("events.startLabel")} value={formatDate(detail.startDate, { month: "short", day: "numeric", year: "numeric" })} />
        <DetailStat icon={Users} label={t("events.organiser")} value={detail.organizer?.fullName ?? "—"} />
      </div>

      {detail.capacity && (
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">{t("events.registrationLabel")}</span>
            <span className="font-medium">{regCount} / {detail.capacity}</span>
          </div>
          <Progress value={fillRate} className="h-2" />
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> {t("events.registeredMembers", { n: regCount })}</p>
        {regCount === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{t("events.noRegistrations")}</p>
        ) : (
          <ScrollArea className="h-60 rounded-md border">
            <div className="divide-y">
              {detail.registrations?.map((r) => (
                <div key={r.id} className="flex items-center gap-2.5 p-2.5">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-primary/15 text-primary text-[10px]">{initials(r.member.fullName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.member.fullName}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">{r.member.regNumber}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{formatDate(r.registeredAt, { month: "short", day: "numeric" })}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

function DetailStat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="font-medium text-sm mt-1 truncate">{value}</p>
    </div>
  );
}

function toLocalDatetime(iso: string): string {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}
