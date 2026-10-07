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
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Settings as SettingsIcon, Users, ScrollText, Save, ShieldCheck, AlertCircle, KeyRound, Search, Key, Info,
} from "lucide-react";
import { api, formatDateTime, initials, timeAgo } from "@/lib/utils/client";
import type { SystemSetting, UserAccount, Role } from "@/types";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { toast } from "sonner";

export function SettingsView() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [tab, setTab] = useState("general");

  if (user?.role !== "SUPER_ADMIN") {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          <ShieldCheck className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
          {t("settings.onlySuperAdmins")}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-serif tracking-tight flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-primary" /> {t("settings.title")}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t("settings.subtitle")}
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="general"><SettingsIcon className="mr-1.5 h-3.5 w-3.5" /> {t("settings.general")}</TabsTrigger>
          <TabsTrigger value="users"><Users className="mr-1.5 h-3.5 w-3.5" /> {t("settings.users")}</TabsTrigger>
          <TabsTrigger value="audit"><ScrollText className="mr-1.5 h-3.5 w-3.5" /> {t("settings.auditLog")}</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4">
          <GeneralSettings />
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <UsersSettings />
        </TabsContent>
        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardContent className="py-12 text-center">
              <ScrollText className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="mt-3 font-medium">{t("settings.auditLog")}</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                {t("settings.auditLogDesc")}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GeneralSettings() {
  const { t, locale } = useI18n();
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { value: string; description: string }>>({});

  const load = async () => {
    setLoading(true);
    try {
      const d = await api.get<{ items: SystemSetting[] }>("/api/settings");
      setSettings(d.items ?? []);
      const map: Record<string, { value: string; description: string }> = {};
      (d.items ?? []).forEach((s) => { map[s.key] = { value: s.value, description: s.description ?? "" }; });
      setDrafts(map);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("settings.loadFailed"));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const updateDraft = (key: string, field: "value" | "description", v: string) => {
    setDrafts((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? { value: "", description: "" }), [field]: v },
    }));
  };

  const save = async (key: string) => {
    const draft = drafts[key];
    if (!draft) return;
    setSaving(key);
    try {
      await api.put("/api/settings", { key, value: draft.value, description: draft.description || null });
      toast.success(t("settings.savedKey", { key }));
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("settings.saveFailed"));
    } finally { setSaving(null); }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
      </div>
    );
  }

  const knownKeys = ["ORG_NAME", "SMS_SENDER_ID", "DEFAULT_AUDIENCE", "ATTENDANCE_THRESHOLD", "CURRENCY", "CHAPTER_MOTTO", "CONTACT_EMAIL", "CONTACT_PHONE"];

  return (
    <div className="space-y-4">
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">{t("settings.configValuesStored")}</p>
            <p className="text-muted-foreground mt-0.5">
              {t("settings.generalDesc")}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        {knownKeys.map((k) => {
          const existing = settings.find((s) => s.key === k);
          const draft = drafts[k] ?? { value: "", description: "" };
          const isSaving = saving === k;
          const dirty = existing && (existing.value !== draft.value || (existing.description ?? "") !== draft.description);
          return (
            <Card key={k}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-mono flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-primary" /> {k}
                </CardTitle>
                {existing && (
                  <CardDescription className="text-[10px]">
                    {t("settings.lastUpdated", {
                      when: timeAgo(existing.updatedAt, locale),
                      by: existing.updatedBy?.slice(0, 8) ?? t("settings.lastUpdatedBySystem"),
                    })}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{t("settings.value")}</Label>
                  <Input value={draft.value} onChange={(e) => updateDraft(k, "value", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{t("common.description")}</Label>
                  <Textarea value={draft.description} onChange={(e) => updateDraft(k, "description", e.target.value)} rows={2} />
                </div>
                <Button size="sm" onClick={() => save(k)} disabled={isSaving || !dirty}>
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  {isSaving ? t("common.saving") : dirty ? t("settings.saveChanges") : t("settings.saved")}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Other settings not in known list */}
      {settings.filter((s) => !knownKeys.includes(s.key)).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("settings.otherSettings")}</CardTitle>
            <CardDescription>{t("settings.customKeys")}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("settings.key")}</TableHead>
                    <TableHead>{t("settings.value")}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("common.description")}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t("settings.updated")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settings.filter((s) => !knownKeys.includes(s.key)).map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.key}</TableCell>
                      <TableCell className="text-sm truncate max-w-48">{s.value}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground truncate max-w-48">{s.description ?? "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{formatDateTime(s.updatedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function UsersSettings() {
  const { t, locale } = useI18n();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("ALL");

  // Reset Password Dialog state
  const [resetUser, setResetUser] = useState<UserAccount | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const d = await api.get<{ items: UserAccount[] }>("/api/users");
      setUsers(d.items ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("settings.loadUsersFailed"));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const roleStats = useMemo(() => {
    const counts: Record<string, number> = { SUPER_ADMIN: 0, ADMIN: 0, MEMBER: 0 };
    users.forEach((u) => { counts[u.role] = (counts[u.role] ?? 0) + 1; });
    return counts;
  }, [users]);

  const updateRole = async (id: string, role: Role) => {
    setSaving(id);
    try {
      await api.patch(`/api/users/${id}`, { role });
      toast.success(t("settings.userUpdated"));
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("settings.updateFailed"));
    } finally { setSaving(null); }
  };

  const toggleActive = async (u: UserAccount) => {
    setSaving(u.id);
    try {
      await api.patch(`/api/users/${u.id}`, { isActive: !u.isActive });
      toast.success(u.isActive ? t("settings.userDeactivated") : t("settings.userActivated"));
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("settings.toggleFailed"));
    } finally { setSaving(null); }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser || !newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setResetting(true);
    try {
      await api.patch(`/api/users/${resetUser.id}`, { password: newPassword });
      toast.success(`Password reset successfully for ${resetUser.username}!`);
      setResetUser(null);
      setNewPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setResetting(false);
    }
  };

  const roleKeys: Role[] = ["SUPER_ADMIN", "ADMIN", "MEMBER"];

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (filterRole !== "ALL" && u.role !== filterRole) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.member?.fullName?.toLowerCase().includes(q) ?? false) ||
        (u.member?.regNumber?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [users, search, filterRole]);

  return (
    <div className="space-y-4">
      {/* Super Admin Access Policy Notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20 text-foreground">
        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-semibold text-primary">Role & Permission Policy</p>
          <p className="text-muted-foreground leading-relaxed">
            All users who self-register or join via Google OAuth are assigned the default base role <strong className="text-foreground">Member</strong>.
            As Super Admin, you have exclusive control below to elevate any individual to <strong className="text-foreground">Admin</strong> (Ministry Leader) and revoke permissions back to Member whenever needed.
          </p>
        </div>
      </div>

      {/* Role distribution */}
      <div className="space-y-2">
        <div>
          <p className="text-sm font-medium">{t("settings.roleDistribution")}</p>
          <p className="text-xs text-muted-foreground">{t("settings.roleDistributionDesc")}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {roleKeys.map((r) => (
            <Card key={r}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t(`role.${r}`)}</p>
                    <p className="text-3xl font-serif font-semibold mt-1">{roleStats[r] ?? 0}</p>
                  </div>
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                    r === "SUPER_ADMIN" ? "bg-rose-500/10 text-rose-600" : r === "ADMIN" ? "bg-amber-500/10 text-amber-600" : "bg-primary/10 text-primary"
                  }`}>
                    <Users className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 leading-snug">{t(`role.${r}.desc`)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Users table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4">
          <div>
            <CardTitle className="text-base">{t("settings.userAccounts")}</CardTitle>
            <CardDescription>{t("settings.userCountTotal", { n: users.length })}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-48 sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search username, name, email…"
                className="pl-8 h-8 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="h-8 text-xs w-28">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Roles</SelectItem>
                <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="MEMBER">Member</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {search ? "No users matching your search." : t("settings.noUsers")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("settings.user")}</TableHead>
                    <TableHead>{t("settings.memberLink")}</TableHead>
                    <TableHead>{t("settings.role")}</TableHead>
                    <TableHead>{t("settings.active")}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t("settings.lastLogin")}</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className="bg-primary/15 text-primary text-[10px]">
                              {initials(u.member?.fullName ?? u.username)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{u.username}</p>
                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {u.member ? (
                          <div className="min-w-0">
                            <p className="text-sm truncate">{u.member.fullName}</p>
                            <p className="text-[10px] text-muted-foreground font-mono truncate">{u.member.regNumber}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">{t("settings.noMemberProfile")}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={u.role}
                          onValueChange={(v) => updateRole(u.id, v as Role)}
                          disabled={saving === u.id}
                        >
                          <SelectTrigger className="h-8 text-xs w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {roleKeys.map((r) => (
                              <SelectItem key={r} value={r}>{t(`role.${r}`)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch checked={u.isActive} onCheckedChange={() => toggleActive(u)} disabled={saving === u.id} />
                          <Badge variant="outline" className={`text-[9px] ${u.isActive ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}>
                            {u.isActive ? t("common.active") : t("settings.disabled")}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {u.lastLoginAt ? timeAgo(u.lastLoginAt, locale) : t("settings.never")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setResetUser(u);
                            setNewPassword("");
                          }}
                          title="Reset user password"
                        >
                          <Key className="h-3.5 w-3.5 mr-1 text-primary" />
                          Reset
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Super Admin Password Reset Dialog */}
      <Dialog open={!!resetUser} onOpenChange={(open) => { if (!open) setResetUser(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-4 w-4 text-primary" />
              Reset Password for {resetUser?.username}
            </DialogTitle>
            <DialogDescription>
              Set a new secure password for this user ({resetUser?.email}). They will be able to immediately sign in using this new password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordReset} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="admin-new-password">New Password</Label>
              <Input
                id="admin-new-password"
                type="password"
                placeholder="Enter at least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={resetting}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setResetUser(null)} disabled={resetting}>
                Cancel
              </Button>
              <Button type="submit" disabled={resetting || newPassword.length < 6}>
                {resetting ? "Resetting…" : "Update Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
