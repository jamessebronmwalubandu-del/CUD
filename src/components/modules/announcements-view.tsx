"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Megaphone, Send, Pin, MessageSquare, Trash2, Smartphone, AlertCircle, CheckCircle2,
} from "lucide-react";
import { api, formatDateTime, initials, label, LABELS, timeAgo } from "@/lib/utils/client";
import type { Announcement, Comment, AudienceType, Priority, Ministry } from "@/types";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { toast } from "sonner";

const PRIORITY_TONES: Record<Priority, string> = {
  LOW: "bg-muted text-muted-foreground",
  NORMAL: "bg-primary/10 text-primary",
  HIGH: "bg-amber-500/10 text-amber-600",
  URGENT: "bg-rose-500/10 text-rose-600",
};

export function AnnouncementsView() {
  const { t } = useI18n();
  const { user } = useAuth();
  const canPost = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Announcement | null>(null);
  const [showSms, setShowSms] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const d = await api.get<{ items: Announcement[] }>("/api/announcements?pageSize=50");
      setItems(d.items ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("announcements.loadFailed"));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-serif tracking-tight flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" /> {t("announcements.title")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("announcements.subtitle", { total: items.length })}
          </p>
        </div>
        {canPost && (
          <Button variant="outline" onClick={() => setShowSms(true)}>
            <Smartphone className="mr-1.5 h-4 w-4" /> {t("announcements.smsBroadcast")}
          </Button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Feed */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
            </div>
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Megaphone className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="mt-3 font-medium">{t("announcements.noAnnouncements")}</p>
                <p className="text-sm text-muted-foreground mt-1">{t("announcements.checkBack")}</p>
              </CardContent>
            </Card>
          ) : (
            items.map((a) => (
              <AnnouncementCard key={a.id} announcement={a} onOpen={() => setSelected(a)} />
            ))
          )}
        </div>

        {/* Composer */}
        <div className="space-y-4">
          {canPost ? (
            <Composer onPosted={load} />
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-40" />
                {t("announcements.onlyAdmins")}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selected && <AnnouncementDetail announcement={selected} onClose={() => setSelected(null)} />}
        </DialogContent>
      </Dialog>

      {/* SMS Broadcast dialog */}
      <Dialog open={showSms} onOpenChange={setShowSms}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Smartphone className="h-5 w-5 text-primary" /> {t("announcements.broadcastTitle")}</DialogTitle>
            <DialogDescription>{t("announcements.broadcastDesc")}</DialogDescription>
          </DialogHeader>
          <SmsBroadcastForm onClose={() => setShowSms(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AnnouncementCard({ announcement: a, onOpen }: { announcement: Announcement; onOpen: () => void }) {
  const { t, locale } = useI18n();
  const commentCount = a._count?.comments ?? 0;
  return (
    <Card className="card-hover">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarFallback className="bg-primary/15 text-primary text-xs font-medium">
              {initials(a.author?.fullName ?? "?")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm">{a.author?.fullName ?? t("announcements.unknown")}</p>
              <span className="text-xs text-muted-foreground">{timeAgo(a.createdAt, locale)}</span>
              {a.pinned && <span title={t("announcements.pinned")} className="text-amber-500"><Pin className="h-3.5 w-3.5 fill-current" /></span>}
              <Badge variant="outline" className={`text-[9px] ${PRIORITY_TONES[a.priority]}`}>{label(t, "priority", a.priority)}</Badge>
              <Badge variant="outline" className="text-[9px]">{label(t, "audience", a.audience)}</Badge>
              {a.smsSent && <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary"><Smartphone className="h-3 w-3 mr-0.5" />{t("announcements.smsBadge")}</Badge>}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {a.ministry ? t("announcements.ministryPrefix", { name: a.ministry.name }) : t("announcements.chapterWide")}
              {a.audienceRef && a.audience !== "ALL" && ` · ${a.audienceRef}`}
            </p>
          </div>
        </div>

        <div>
          <button onClick={onOpen} className="text-left w-full">
            <h3 className="font-serif font-semibold text-base leading-tight">{a.pinned && "📌 "}{a.title}</h3>
            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line line-clamp-4">{a.content}</p>
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t">
          <button onClick={onOpen} className="flex items-center gap-1 hover:text-foreground">
            <MessageSquare className="h-3.5 w-3.5" />
            {t("announcements.comments", { n: commentCount })}
          </button>
          {a.smsSent && a.smsRecipients > 0 && (
            <span className="flex items-center gap-1"><Smartphone className="h-3.5 w-3.5" /> {t("announcements.smsSentTo", { n: a.smsRecipients })}</span>
          )}
          <span className="ml-auto text-[10px]">{formatDateTime(a.createdAt)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function Composer({ onPosted }: { onPosted: () => void }) {
  const { t } = useI18n();
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    content: "",
    audience: "ALL" as AudienceType,
    audienceRef: "",
    priority: "NORMAL" as Priority,
    pinned: false,
    ministryId: "",
  });
  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    api.get<{ items: Ministry[] }>("/api/ministries").then((d) => setMinistries(d.items ?? [])).catch(() => {});
  }, []);

  const reset = () => setForm({ title: "", content: "", audience: "ALL", audienceRef: "", priority: "NORMAL", pinned: false, ministryId: "" });

  const post = async (alsoSms: boolean) => {
    if (!form.title.trim() || !form.content.trim()) { toast.error(t("announcements.titleContentRequired")); return; }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        audience: form.audience,
        audienceRef: form.audience === "MINISTRY" ? form.ministryId : form.audienceRef || null,
        priority: form.priority,
        pinned: form.pinned,
        ministryId: form.audience === "MINISTRY" ? form.ministryId : null,
      };
      const created = await api.post<Announcement>("/api/announcements", payload);
      if (alsoSms) {
        try {
          const sms = await api.post<{ sent: number; failed: number; senderId: string }>("/api/sms/broadcast", {
            announcementId: created.id,
            message: `${form.title}\n\n${form.content}`.slice(0, 920),
            audience: form.audience,
            audienceRef: payload.audienceRef,
          });
          toast.success(t("announcements.postedAndSms", { n: sms.sent }));
        } catch (err) {
          toast.error(t("announcements.postedSmsFailed", { err: err instanceof Error ? err.message : "unknown" }));
        }
      } else {
        toast.success(t("announcements.announcementCreated"));
      }
      reset();
      onPosted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("announcements.postFailed"));
    } finally { setSaving(false); }
  };

  const refExample = form.audience === "COURSE"
    ? t("announcements.exampleCourse")
    : form.audience === "FACULTY"
      ? t("announcements.exampleFaculty")
      : t("announcements.exampleHostel");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Megaphone className="h-4 w-4 text-primary" /> {t("announcements.newAnnouncement")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input placeholder={t("announcements.titlePlaceholder")} value={form.title} onChange={(e) => set("title", e.target.value)} />
        <Textarea
          placeholder={t("announcements.contentPlaceholder")}
          value={form.content}
          onChange={(e) => set("content", e.target.value)}
          rows={5}
        />
        <div className="grid grid-cols-2 gap-2">
          <Select value={form.audience} onValueChange={(v) => set("audience", v)}>
            <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.keys(LABELS.audience).map((v) => <SelectItem key={v} value={v}>{label(t, "audience", v)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
            <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.keys(LABELS.priority).map((v) => <SelectItem key={v} value={v}>{label(t, "priority", v)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {form.audience === "MINISTRY" && (
          <Select value={form.ministryId} onValueChange={(v) => set("ministryId", v)}>
            <SelectTrigger className="text-xs h-9"><SelectValue placeholder={t("announcements.selectMinistry")} /></SelectTrigger>
            <SelectContent>
              {ministries.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {form.audience !== "ALL" && form.audience !== "MINISTRY" && (
          <Input
            placeholder={t("announcements.refValue", { example: refExample })}
            value={form.audienceRef}
            onChange={(e) => set("audienceRef", e.target.value)}
            className="text-xs h-9"
          />
        )}
        <label className="flex items-center gap-2 text-xs">
          <Checkbox checked={form.pinned} onCheckedChange={(v) => set("pinned", v === true)} />
          <Pin className="h-3 w-3" /> {t("announcements.pinToTop")}
        </label>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => post(false)} disabled={saving}>
            <Megaphone className="mr-1.5 h-3.5 w-3.5" /> {t("announcements.post")}
          </Button>
          <Button className="flex-1" onClick={() => post(true)} disabled={saving}>
            <Smartphone className="mr-1.5 h-3.5 w-3.5" /> {t("announcements.postAndSms")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AnnouncementDetail({ announcement, onClose }: { announcement: Announcement; onClose: () => void }) {
  const { t, locale } = useI18n();
  const { user, member } = useAuth();
  const [detail, setDetail] = useState<Announcement | null>(announcement);
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);
  const canDeleteAnnouncement = user?.role === "SUPER_ADMIN";

  const refresh = async () => {
    try {
      const d = await api.get<Announcement>(`/api/announcements/${announcement.id}`);
      setDetail(d);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("announcements.loadFailed"));
    }
  };

  useEffect(() => { refresh(); }, [announcement.id]);

  const addComment = async () => {
    if (!comment.trim()) return;
    setPosting(true);
    try {
      await api.post(`/api/announcements/${announcement.id}/comments`, { content: comment.trim() });
      setComment("");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("announcements.commentFailed"));
    } finally { setPosting(false); }
  };

  const deleteComment = async (_c: Comment) => {
    if (!detail) return;
    // Note: comments endpoint only supports GET/POST — we soft-delete via announcement [id] endpoint
    // Actually API doesn't support comment deletion; we hide locally if it's own comment
    toast.info(t("announcements.commentDeleteNotSupported"));
  };

  const deleteAnnouncement = async () => {
    try {
      await api.delete(`/api/announcements/${announcement.id}`);
      toast.success(t("announcements.announcementDeleted"));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("announcements.deleteFailed"));
    }
  };

  if (!detail) return <div className="p-6 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <DialogHeader>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`text-[10px] ${PRIORITY_TONES[detail.priority]}`}>{label(t, "priority", detail.priority)}</Badge>
          <Badge variant="outline" className="text-[10px]">{label(t, "audience", detail.audience)}</Badge>
          {detail.pinned && <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600"><Pin className="h-3 w-3 mr-0.5" />{t("announcements.pinned")}</Badge>}
          {detail.smsSent && <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary"><Smartphone className="h-3 w-3 mr-0.5" />{t("announcements.smsBadge")}</Badge>}
        </div>
        <DialogTitle className="font-serif text-xl">{detail.pinned && "📌 "}{detail.title}</DialogTitle>
        <DialogDescription>
          {t("announcements.byAuthorDate", { name: detail.author?.fullName ?? t("announcements.unknown"), date: formatDateTime(detail.createdAt) })}
          {detail.ministry ? ` · ${detail.ministry.name}` : ""}
        </DialogDescription>
      </DialogHeader>

      <div className="rounded-md bg-muted/30 p-4 text-sm whitespace-pre-line">{detail.content}</div>

      {canDeleteAnnouncement && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={deleteAnnouncement}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> {t("announcements.deleteAnnouncement")}
          </Button>
        </div>
      )}

      <div className="space-y-3">
        <p className="text-sm font-medium flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> {t("announcements.comments", { n: detail.comments?.length ?? 0 })}</p>

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {detail.comments?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t("announcements.noComments")}</p>
          ) : (
            detail.comments?.map((c) => (
              <div key={c.id} className="flex items-start gap-2.5 rounded-md border p-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary/15 text-primary text-[10px]">{initials(c.member?.fullName ?? "?")}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{c.member?.fullName ?? t("announcements.unknown")}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(c.createdAt, locale)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-line">{c.content}</p>
                </div>
                {(member?.id === c.memberId || canDeleteAnnouncement) && (
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-50 hover:opacity-100 hover:text-destructive" onClick={() => deleteComment(c)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2">
          <Textarea
            placeholder={t("announcements.addComment")}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            className="text-sm"
          />
          <Button onClick={addComment} disabled={posting || !comment.trim()} className="self-end">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function SmsBroadcastForm({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; senderId: string; totalRecipients: number; note: string } | null>(null);
  const [form, setForm] = useState({
    message: "",
    audience: "ALL" as AudienceType,
    audienceRef: "",
    ministryId: "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    api.get<{ items: Ministry[] }>("/api/ministries").then((d) => setMinistries(d.items ?? [])).catch(() => {});
  }, []);

  const charCount = form.message.length;
  const segments = Math.ceil(charCount / 160) || 1;

  const send = async () => {
    if (!form.message.trim()) { toast.error(t("announcements.messageRequired")); return; }
    setSending(true);
    try {
      const payload = {
        message: form.message.trim().slice(0, 920),
        audience: form.audience,
        audienceRef: form.audience === "MINISTRY" ? form.ministryId : form.audienceRef || null,
      };
      const r = await api.post<{ sent: number; failed: number; senderId: string; totalRecipients: number; note: string }>("/api/sms/broadcast", payload);
      setResult(r);
      toast.success(t("announcements.smsSent", { n: r.sent }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("announcements.broadcastFailed"));
    } finally { setSending(false); }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">{t("announcements.audience")}</Label>
          <Select value={form.audience} onValueChange={(v) => set("audience", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.keys(LABELS.audience).map((v) => <SelectItem key={v} value={v}>{label(t, "audience", v)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {form.audience === "MINISTRY" ? (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t("nav.ministries")}</Label>
            <Select value={form.ministryId} onValueChange={(v) => set("ministryId", v)}>
              <SelectTrigger><SelectValue placeholder={t("announcements.selectLabel")} /></SelectTrigger>
              <SelectContent>
                {ministries.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        ) : form.audience !== "ALL" && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t("announcements.reference")}</Label>
            <Input value={form.audienceRef} onChange={(e) => set("audienceRef", e.target.value)} placeholder={`${t("announcements.reference")}…`} />
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">{t("announcements.message")}</Label>
        <Textarea
          value={form.message}
          onChange={(e) => set("message", e.target.value.slice(0, 920))}
          rows={5}
          placeholder={t("announcements.messagePlaceholder")}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{t("announcements.chars", { n: charCount })}</span>
          <span>{t("announcements.segments", { n: segments })}</span>
        </div>
      </div>

      {result && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> {t("announcements.broadcastComplete")}
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div><p className="text-muted-foreground">{t("announcements.senderId")}</p><p className="font-medium">{result.senderId}</p></div>
            <div><p className="text-muted-foreground">{t("announcements.sent")}</p><p className="font-medium text-emerald-600">{result.sent}</p></div>
            <div><p className="text-muted-foreground">{t("announcements.failed")}</p><p className="font-medium text-rose-600">{result.failed}</p></div>
          </div>
          <p className="text-[10px] text-muted-foreground flex items-start gap-1.5">
            <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
            {result.note}
          </p>
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={sending}>{result ? t("common.close") : t("common.cancel")}</Button>
        <Button onClick={send} disabled={sending || !form.message.trim() || !!result}>
          {sending ? t("announcements.sending") : <><Send className="mr-1.5 h-4 w-4" /> {t("announcements.send")}</>}
        </Button>
      </DialogFooter>
    </div>
  );
}
