"use client";

import { Fragment, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  ShieldAlert, Filter, ChevronDown, ChevronRight, RefreshCw, ScrollText,
} from "lucide-react";
import { api, formatDateTime, initials } from "@/lib/utils/client";
import type { AuditLog } from "@/types";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { toast } from "sonner";

const MODULES = ["AUTH", "MEMBERS", "SKILLS", "MINISTRIES", "ATTENDANCE", "DOCUMENTS", "ANNOUNCEMENTS", "EVENTS", "SETTINGS"];
const ACTIONS = ["CREATE", "UPDATE", "DELETE", "APPROVE", "REJECT", "LOGIN", "LOGOUT"];

const ACTION_TONES: Record<string, string> = {
  CREATE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  UPDATE: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  DELETE: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  APPROVE: "bg-primary/10 text-primary border-primary/20",
  REJECT: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  LOGIN: "bg-muted text-muted-foreground",
  LOGOUT: "bg-muted text-muted-foreground",
};

const MODULE_TONES: Record<string, string> = {
  AUTH: "bg-purple-500/10 text-purple-700",
  MEMBERS: "bg-primary/10 text-primary",
  SKILLS: "bg-amber-500/10 text-amber-600",
  MINISTRIES: "bg-emerald-500/10 text-emerald-600",
  ATTENDANCE: "bg-rose-500/10 text-rose-600",
  DOCUMENTS: "bg-cyan-500/10 text-cyan-700",
  ANNOUNCEMENTS: "bg-pink-500/10 text-pink-700",
  EVENTS: "bg-teal-500/10 text-teal-700",
  SETTINGS: "bg-slate-500/10 text-slate-700",
};

export function AuditView() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [moduleFilter, setModuleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [actorId, setActorId] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [viewing, setViewing] = useState<AuditLog | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (moduleFilter) params.set("module", moduleFilter);
      if (actionFilter) params.set("action", actionFilter);
      if (actorId) params.set("actorId", actorId);
      const d = await api.get<{ items: AuditLog[]; total: number }>(`/api/audit-logs?${params}`);
      setLogs(d.items ?? []);
      setTotal(d.total ?? 0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("audit.loadFailed"));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, moduleFilter, actionFilter, actorId]);

  if (user?.role !== "SUPER_ADMIN") {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          <ShieldAlert className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
          {t("audit.onlySuperAdmins")}
        </CardContent>
      </Card>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-serif tracking-tight flex items-center gap-2">
            <ScrollText className="h-6 w-6 text-primary" /> {t("audit.title")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("audit.subtitle", { total: total.toLocaleString() })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> {t("common.refresh")}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={moduleFilter || "ALL"} onValueChange={(v) => { setPage(1); setModuleFilter(v === "ALL" ? "" : v); }}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder={t("audit.allModules")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("audit.allModules")}</SelectItem>
                {MODULES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={actionFilter || "ALL"} onValueChange={(v) => { setPage(1); setActionFilter(v === "ALL" ? "" : v); }}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder={t("audit.allActions")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("audit.allActions")}</SelectItem>
                {ACTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              placeholder={t("audit.actorId")}
              value={actorId}
              onChange={(e) => { setPage(1); setActorId(e.target.value); }}
              className="flex-1 font-mono text-xs"
            />
            {(moduleFilter || actionFilter || actorId) && (
              <Button variant="ghost" onClick={() => { setModuleFilter(""); setActionFilter(""); setActorId(""); setPage(1); }}>{t("common.reset")}</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("audit.activity")}</CardTitle>
          <CardDescription>
            {t("audit.showing", { shown: logs.length, total: total.toLocaleString(), page, pages: totalPages })}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <ScrollText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              {t("audit.noEntriesFiltered")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>{t("audit.timestamp")}</TableHead>
                    <TableHead>{t("audit.actor")}</TableHead>
                    <TableHead>{t("audit.action")}</TableHead>
                    <TableHead>{t("audit.module")}</TableHead>
                    <TableHead>{t("audit.description")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const isOpen = expanded.has(log.id);
                    const metadata = parseMetadata(log.metadata);
                    return (
                      <Fragment key={log.id}>
                        <TableRow className="cursor-pointer hover:bg-accent/50" onClick={() => metadata && toggle(log.id)}>
                          <TableCell className="w-8">
                            {metadata ? (
                              <button className="text-muted-foreground">
                                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </button>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(log.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7 shrink-0">
                                <AvatarFallback className="bg-primary/15 text-primary text-[10px]">
                                  {initials(log.actor?.fullName ?? "?")}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{log.actor?.fullName ?? t("audit.system")}</p>
                                <p className="text-[10px] text-muted-foreground font-mono truncate">{log.actor?.regNumber ?? log.actorId?.slice(0, 8) ?? "—"}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${ACTION_TONES[log.action] ?? "bg-muted text-muted-foreground"}`}>{log.action}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${MODULE_TONES[log.module] ?? "bg-muted text-muted-foreground"}`}>{log.module}</Badge>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm truncate max-w-md" title={log.description}>{log.description}</p>
                            {log.ipAddress && <p className="text-[10px] text-muted-foreground font-mono">{log.ipAddress}</p>}
                          </TableCell>
                        </TableRow>
                        {isOpen && !!metadata && (
                          <TableRow key={`${log.id}-meta`} className="bg-muted/30">
                            <TableCell></TableCell>
                            <TableCell colSpan={5}>
                              <pre className="text-xs font-mono whitespace-pre-wrap break-all max-h-60 overflow-y-auto p-2 rounded bg-background">
                                {JSON.stringify(metadata, null, 2)}
                              </pre>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{t("common.page")} {page} {t("common.of")} {totalPages} · {total.toLocaleString()} {t("audit.entries")}</p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>{t("common.previous")}</Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>{t("common.next")}</Button>
          </div>
        </div>
      )}

      {/* Detail dialog (optional viewer) */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("audit.entryTitle")}</DialogTitle>
            <DialogDescription>{viewing && formatDateTime(viewing.createdAt)}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function parseMetadata(raw: string | null): unknown | null {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return raw; }
}
