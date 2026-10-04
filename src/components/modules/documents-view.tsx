"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
  FileText, Sheet, Image as ImageIcon, Upload, Download, Trash2, Search, FolderOpen, Eye, Files,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { api, formatFileSize, formatDate, initials, label, LABELS, timeAgo } from "@/lib/utils/client";
import type { Document as Doc, DocumentCategory, AccessLevel, Ministry } from "@/types";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { toast } from "sonner";

const CHART_COLORS = [
  "oklch(0.55 0.12 175)", "oklch(0.7 0.15 75)", "oklch(0.62 0.22 25)",
  "oklch(0.6 0.2 305)", "oklch(0.65 0.18 230)", "oklch(0.55 0.15 145)",
  "oklch(0.7 0.18 90)", "oklch(0.6 0.22 340)",
];

const TOOLTIP_STYLE = { borderRadius: 12, border: "1px solid oklch(0 0 0 / 0.1)", background: "oklch(1 0 0)", fontSize: 12 };

export function DocumentsView() {
  const { t } = useI18n();
  const { user } = useAuth();
  const canUpload = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";
  const canDelete = user?.role === "SUPER_ADMIN";

  const [docs, setDocs] = useState<Doc[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [ministryFilter, setMinistryFilter] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [deleting, setDeleting] = useState<Doc | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (ministryFilter) params.set("ministryId", ministryFilter);
      if (search) params.set("q", search);
      const [d, mins] = await Promise.all([
        api.get<{ items: Doc[] }>(`/api/documents?${params}`),
        api.get<{ items: Ministry[] }>("/api/ministries"),
      ]);
      setDocs(d.items ?? []);
      setMinistries(mins.items ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("documents.loadFailed"));
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const debounce = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(debounce);
  }, [search, category, ministryFilter]);

  const totalDownloads = useMemo(() => docs.reduce((s, d) => s + d.downloads, 0), [docs]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of docs) {
      const k = d.category;
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([k, v]) => ({
      name: label(t, "documentCategory", k as DocumentCategory),
      value: v,
    }));
  }, [docs, t]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-serif tracking-tight flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-primary" /> {t("documents.title")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("documents.subtitle")}
          </p>
        </div>
        {canUpload && (
          <Button onClick={() => setShowUpload(true)}>
            <Upload className="mr-1.5 h-4 w-4" /> {t("documents.uploadDocument")}
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Files} label={t("documents.totalDocuments")} value={docs.length} />
        <StatCard icon={Download} label={t("documents.totalDownloads")} value={totalDownloads} />
        <StatCard icon={FolderOpen} label={t("documents.categories")} value={byCategory.length} />
        <StatCard icon={FileText} label={t("nav.ministries")} value={ministries.length} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("documents.searchPlaceholderLong")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={category || "ALL"} onValueChange={(v) => setCategory(v === "ALL" ? "" : v)}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder={t("documents.allCategories")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("documents.allCategories")}</SelectItem>
                {Object.keys(LABELS.documentCategory).map((v) => <SelectItem key={v} value={v}>{label(t, "documentCategory", v)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={ministryFilter || "ALL"} onValueChange={(v) => setMinistryFilter(v === "ALL" ? "" : v)}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder={t("documents.allMinistries")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("documents.allMinistries")}</SelectItem>
                {ministries.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {(search || category || ministryFilter) && (
              <Button variant="ghost" onClick={() => { setSearch(""); setCategory(""); setMinistryFilter(""); }}>{t("common.reset")}</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Document grid */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
            </div>
          ) : docs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="mt-3 font-medium">{t("documents.noDocuments")}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {search || category || ministryFilter ? t("documents.tryAdjusting") : canUpload ? t("documents.uploadFirst") : t("ministries.checkBack")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {docs.map((d) => (
                <DocCard key={d.id} doc={d} canDelete={canDelete} onDelete={() => setDeleting(d)} />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar — category breakdown */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("documents.byCategory")}</CardTitle>
            </CardHeader>
            <CardContent>
              {byCategory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">{t("documents.noData")}</p>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={42} outerRadius={68} paddingAngle={3} cornerRadius={6}>
                        {byCategory.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upload dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("documents.uploadDocument")}</DialogTitle>
            <DialogDescription>{t("documents.uploadDesc")}</DialogDescription>
          </DialogHeader>
          <UploadForm
            ministries={ministries}
            onSaved={() => { setShowUpload(false); load(); }}
            onCancel={() => setShowUpload(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("documents.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("documents.deleteConfirmMsg", { title: deleting?.title ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleting) return;
                try {
                  await api.delete(`/api/documents/${deleting.id}`);
                  toast.success(t("documents.deleted"));
                  setDeleting(null);
                  load();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : t("documents.deleteFailed"));
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

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-semibold leading-none mt-1">{value}</p>
        </div>
        <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function DocCard({ doc, canDelete, onDelete }: { doc: Doc; canDelete: boolean; onDelete: () => void }) {
  const { t, locale } = useI18n();
  const Icon = doc.fileType === "pdf" ? FileText
    : doc.fileType === "docx" ? FileText
    : doc.fileType === "xlsx" ? Sheet
    : ["png", "jpg", "jpeg", "webp"].includes(doc.fileType) ? ImageIcon
    : FileText;

  const isPreviewable = doc.fileType === "pdf" || ["png", "jpg", "jpeg", "webp"].includes(doc.fileType);

  const openDownload = () => {
    // Hit API to bump download counter, then open file
    api.get(`/api/documents/${doc.id}`).catch(() => {});
    window.open(doc.filePath, "_blank");
  };

  return (
    <Card className="card-hover group">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium leading-tight truncate">{doc.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{doc.fileName}</p>
          </div>
          {canDelete && (
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {doc.description && <p className="text-xs text-muted-foreground line-clamp-2">{doc.description}</p>}

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-[10px] bg-primary/5">{label(t, "documentCategory", doc.category)}</Badge>
          <Badge variant="outline" className="text-[10px] uppercase">{doc.fileType}</Badge>
          {doc.ministry && <Badge variant="outline" className="text-[10px]">{doc.ministry.name}</Badge>}
          <Badge variant="outline" className="text-[10px]">{label(t, "accessLevel", doc.accessLevel as AccessLevel)}</Badge>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
          <span>{formatFileSize(doc.fileSize)} · {doc.downloads} {t("documents.downloadShort")}</span>
          <span>{timeAgo(doc.createdAt, locale)}</span>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1" onClick={openDownload}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> {t("common.download")}
          </Button>
          {isPreviewable && (
            <Button size="sm" variant="ghost" onClick={() => window.open(doc.filePath, "_blank")}>
              <Eye className="mr-1.5 h-3.5 w-3.5" /> {t("common.preview")}
            </Button>
          )}
        </div>

        {doc.uploadedBy && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary/15 text-primary text-[8px] font-medium">
              {initials(doc.uploadedBy.fullName)}
            </span>
            {t("documents.uploadedBy")} {doc.uploadedBy.fullName}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function UploadForm({ ministries, onSaved, onCancel }: { ministries: Ministry[]; onSaved: () => void; onCancel: () => void }) {
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "OTHER" as DocumentCategory,
    ministryId: "",
    accessLevel: "ALL" as AccessLevel,
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { toast.error(t("documents.pleaseSelectFile")); return; }
    if (!form.title) { toast.error(t("validation.required", { field: t("common.title") })); return; }
    setSaving(true);
    setProgress(5);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("category", form.category);
      if (form.ministryId) fd.append("ministryId", form.ministryId);
      fd.append("accessLevel", form.accessLevel);

      // Fake progress for UX (FormData upload doesn't expose progress here)
      const interval = setInterval(() => setProgress((p) => Math.min(90, p + 10)), 200);

      await api.post("/api/documents", fd);
      clearInterval(interval);
      setProgress(100);
      toast.success(t("documents.uploaded"));
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("documents.uploadFailed"));
    } finally {
      setSaving(false);
      setProgress(0);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">{t("documents.file")} <span className="text-destructive">*</span></Label>
        <div className="rounded-lg border-2 border-dashed p-4 text-center">
          <input
            id="doc-file"
            type="file"
            accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.webp"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              if (f && !form.title) set("title", f.name.replace(/\.[^.]+$/, ""));
            }}
            className="hidden"
          />
          <label htmlFor="doc-file" className="cursor-pointer">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-1" />
            <p className="text-sm font-medium">{file ? file.name : t("documents.selectFile")}</p>
            <p className="text-xs text-muted-foreground">{file ? formatFileSize(file.size) : t("documents.fileHint")}</p>
          </label>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">{t("common.title")} <span className="text-destructive">*</span></Label>
        <Input value={form.title} onChange={(e) => set("title", e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">{t("common.description")}</Label>
        <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">{t("documents.category")} <span className="text-destructive">*</span></Label>
          <Select value={form.category} onValueChange={(v) => set("category", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.keys(LABELS.documentCategory).map((v) => <SelectItem key={v} value={v}>{label(t, "documentCategory", v)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">{t("documents.accessLevelLabel")}</Label>
          <Select value={form.accessLevel} onValueChange={(v) => set("accessLevel", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.keys(LABELS.accessLevel).map((v) => <SelectItem key={v} value={v}>{label(t, "accessLevel", v)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">{t("documents.ministry")}</Label>
        <Select value={form.ministryId || "NONE"} onValueChange={(v) => set("ministryId", v === "NONE" ? "" : v)}>
          <SelectTrigger><SelectValue placeholder={t("documents.noneChapterWide")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">{t("documents.noneChapterWide")}</SelectItem>
            {ministries.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {saving && progress > 0 && (
        <div className="space-y-1">
          <Progress value={progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground text-center">{t("documents.uploading")} {progress}%</p>
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>{t("common.cancel")}</Button>
        <Button type="submit" disabled={saving || !file}>{saving ? t("documents.uploading") : t("common.upload")}</Button>
      </DialogFooter>
    </form>
  );
}
