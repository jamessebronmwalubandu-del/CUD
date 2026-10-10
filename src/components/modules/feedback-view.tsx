"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageSquareHeart, Send, ShieldAlert, CheckCircle2, Clock, Eye, Trash2, Reply, Lock, Sparkles, Filter,
} from "lucide-react";
import { api, formatDateTime, initials, timeAgo } from "@/lib/utils/client";
import type { Feedback } from "@/types";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { toast } from "sonner";

const CATEGORY_LABELS: Record<string, string> = {
  GENERAL: "General / Ushauri wa Jumla",
  LEADERSHIP: "Leadership / Uongozi",
  FELLOWSHIP_SERVICES: "Services & Worship / Ibada",
  TECHNICAL: "Technical & IT / Mtandao",
  WELFARE: "Welfare & Social / Ustawi wa Wanachama",
  OTHER: "Other / Mengineyo",
};

const STATUS_TONES: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-600 border-amber-200",
  REVIEWED: "bg-blue-500/10 text-blue-600 border-blue-200",
  RESOLVED: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  ARCHIVED: "bg-muted text-muted-foreground",
};

export function FeedbackView() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";

  const [items, setItems] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("ALL");
  const [respondingTo, setRespondingTo] = useState<Feedback | null>(null);
  const [adminResponseText, setAdminResponseText] = useState("");
  const [newStatus, setNewStatus] = useState("RESOLVED");
  const [updating, setUpdating] = useState(false);

  // New feedback form
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ items: Feedback[] }>("/api/feedback");
      setItems(res.items ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load feedback");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !content.trim()) {
      toast.error("Tafadhali jaza kichwa cha habari na maoni yako.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/api/feedback", {
        subject: subject.trim(),
        content: content.trim(),
        category,
        isAnonymous,
      });
      toast.success("Maoni na ushauri wako umetumwa kikamilifu! Ahsante.");
      setSubject("");
      setContent("");
      setIsAnonymous(false);
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!respondingTo) return;
    setUpdating(true);
    try {
      await api.patch(`/api/feedback/${respondingTo.id}`, {
        status: newStatus,
        adminResponse: adminResponseText.trim() || null,
      });
      toast.success("Hali ya maoni imesasishwa kikamilifu!");
      setRespondingTo(null);
      setAdminResponseText("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update feedback");
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/feedback/${id}`);
      toast.success("Maoni yamefutwa.");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete feedback");
    }
  };

  const filteredItems = items.filter((item) => {
    if (selectedFilter === "ALL") return true;
    return item.category === selectedFilter || item.status === selectedFilter;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif tracking-tight flex items-center gap-2">
            <MessageSquareHeart className="h-7 w-7 text-primary" /> Sanduku la Maoni na Ushauri
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Toa maoni, ushauri, au maombi kwa ajili ya kuendeleza na kuboresha familia yetu ya CASFETA CUD.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2 shadow-md">
          <Send className="h-4 w-4" /> Toa Maoni / Ushauri
        </Button>
      </div>

      {/* Categories & Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Badge
          variant={selectedFilter === "ALL" ? "default" : "outline"}
          className="cursor-pointer py-1.5 px-3 text-xs"
          onClick={() => setSelectedFilter("ALL")}
        >
          Yote ({items.length})
        </Badge>
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
          const count = items.filter((i) => i.category === key).length;
          return (
            <Badge
              key={key}
              variant={selectedFilter === key ? "default" : "outline"}
              className="cursor-pointer py-1.5 px-3 text-xs shrink-0"
              onClick={() => setSelectedFilter(key)}
            >
              {label.split("/")[0].trim()} ({count})
            </Badge>
          );
        })}
      </div>

      {/* Feedback Feed */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <MessageSquareHeart className="h-12 w-12 mx-auto text-muted-foreground/40 mb-2" />
              <p className="font-medium text-base">Bado hakuna maoni yaliyotumwa.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Kuwa wa kwanza kutoa maoni au ushauri wa kujenga ushirika wetu!
              </p>
              <Button onClick={() => setShowForm(true)} variant="outline" className="mt-4 gap-2">
                <Send className="h-4 w-4" /> Andika Maoni Yako
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredItems.map((item) => (
            <Card key={item.id} className="shadow-sm border border-border/60 hover:border-primary/30 transition-all">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-9 w-9 border border-primary/20">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {item.isAnonymous ? "❓" : initials(item.member?.fullName ?? "?")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">
                          {item.isAnonymous ? "Mwanachama (Siri / Anonymous)" : item.member?.fullName ?? "Mwanachama"}
                        </p>
                        {item.isAnonymous && (
                          <Badge variant="outline" className="text-[10px] gap-1 bg-muted">
                            <Lock className="h-2.5 w-2.5" /> Siri
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {timeAgo(item.createdAt, locale)} · {CATEGORY_LABELS[item.category] || item.category}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${STATUS_TONES[item.status]}`}>
                      {item.status}
                    </Badge>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-base text-foreground leading-snug">{item.subject}</h4>
                  <p className="text-sm text-muted-foreground mt-1.5 whitespace-pre-line leading-relaxed">
                    {item.content}
                  </p>
                </div>

                {/* Admin Response Section */}
                {item.adminResponse && (
                  <div className="mt-3 p-3.5 rounded-lg bg-primary/5 border border-primary/15 text-sm space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                      <Sparkles className="h-3.5 w-3.5" /> Majibu ya Uongozi / Leadership Feedback:
                    </div>
                    <p className="text-muted-foreground whitespace-pre-line">{item.adminResponse}</p>
                  </div>
                )}

                {/* Admin Respond Action */}
                {isAdmin && (
                  <div className="pt-2 flex justify-end border-t border-border/40">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5"
                      onClick={() => {
                        setRespondingTo(item);
                        setAdminResponseText(item.adminResponse || "");
                        setNewStatus(item.status);
                      }}
                    >
                      <Reply className="h-3.5 w-3.5 text-primary" /> Jibu / Badili Hali
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Submit Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif text-xl">
              <MessageSquareHeart className="h-5 w-5 text-primary" /> Toa Maoni / Ushauri
            </DialogTitle>
            <DialogDescription>
              Wazo lako ni muhimu sana katika kuimarisha na kukuza ushirika wetu.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Aina ya Maoni (Category)</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Kichwa cha Habari (Subject)</Label>
              <Input
                placeholder="Mfano: Ushauri kuhusu Muda wa Maombi au Ratiba za Ibada"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Maelezo ya Maoni Yako (Content)</Label>
              <Textarea
                placeholder="Andika maoni au ushauri wako kwa uwazi hapa..."
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" /> Tuma kama Siri (Anonymous)
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Jina lako halitatajwa au kuonekana na mtu yeyote.
                </p>
              </div>
              <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Ghairi
              </Button>
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting ? "Inatuma..." : "Tuma Maoni"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Admin Respond Dialog */}
      <Dialog open={!!respondingTo} onOpenChange={(o) => !o && setRespondingTo(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif text-lg">
              <Reply className="h-5 w-5 text-primary" /> Jibu Maoni / Badili Hali
            </DialogTitle>
          </DialogHeader>

          {respondingTo && (
            <div className="space-y-4 pt-2">
              <div className="p-3 rounded-md bg-muted/50 text-xs space-y-1">
                <p className="font-semibold text-foreground">{respondingTo.subject}</p>
                <p className="text-muted-foreground line-clamp-3">{respondingTo.content}</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Hali ya Maoni (Status)</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">PENDING (Bado Inasubiri)</SelectItem>
                    <SelectItem value="REVIEWED">REVIEWED (Imefanyiwa Tathmini)</SelectItem>
                    <SelectItem value="RESOLVED">RESOLVED (Imeshughulikiwa)</SelectItem>
                    <SelectItem value="ARCHIVED">ARCHIVED (Imewekwa Kumbukumbu)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Majibu ya Uongozi (Admin Response)</Label>
                <Textarea
                  placeholder="Andika majibu ya uongozi kwa mwanachama au ushirika..."
                  rows={4}
                  value={adminResponseText}
                  onChange={(e) => setAdminResponseText(e.target.value)}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="ghost" onClick={() => setRespondingTo(null)}>
                  Ghairi
                </Button>
                <Button onClick={handleUpdateStatus} disabled={updating}>
                  {updating ? "Inahifadhi..." : "Hifadhi Majibu"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
