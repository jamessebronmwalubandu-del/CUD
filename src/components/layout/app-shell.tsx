"use client";

import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Search,
  Award,
  Building2,
  CalendarCheck,
  FileText,
  Megaphone,
  CalendarDays,
  BarChart3,
  History,
  Settings,
  LogOut,
  Menu,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  UserCircle,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/rbac/permissions";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/utils/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import type { Role } from "@/types";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { NetworkStatus } from "@/components/layout/network-status";

export type ViewKey =
  | "dashboard"
  | "directory"
  | "members"
  | "skills"
  | "ministries"
  | "attendance"
  | "documents"
  | "announcements"
  | "events"
  | "reports"
  | "audit"
  | "settings"
  | "profile";

interface NavItem {
  key: ViewKey;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
  labelKey: string;
  descKey: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", icon: LayoutDashboard, roles: ["SUPER_ADMIN", "ADMIN", "MEMBER"], labelKey: "nav.dashboard", descKey: "dashboard.description" },
  { key: "directory", icon: Search, roles: ["SUPER_ADMIN", "ADMIN", "MEMBER"], labelKey: "nav.directory", descKey: "directory.title" },
  { key: "members", icon: Users, roles: ["SUPER_ADMIN", "ADMIN"], labelKey: "nav.members", descKey: "members.title" },
  { key: "skills", icon: Award, roles: ["SUPER_ADMIN", "ADMIN", "MEMBER"], labelKey: "nav.skills", descKey: "skills.subtitle" },
  { key: "ministries", icon: Building2, roles: ["SUPER_ADMIN", "ADMIN", "MEMBER"], labelKey: "nav.ministries", descKey: "ministries.title" },
  { key: "attendance", icon: CalendarCheck, roles: ["SUPER_ADMIN", "ADMIN", "MEMBER"], labelKey: "nav.attendance", descKey: "attendance.subtitle" },
  { key: "documents", icon: FileText, roles: ["SUPER_ADMIN", "ADMIN", "MEMBER"], labelKey: "nav.documents", descKey: "documents.subtitle" },
  { key: "announcements", icon: Megaphone, roles: ["SUPER_ADMIN", "ADMIN", "MEMBER"], labelKey: "nav.announcements", descKey: "announcements.subtitle" },
  { key: "events", icon: CalendarDays, roles: ["SUPER_ADMIN", "ADMIN", "MEMBER"], labelKey: "nav.events", descKey: "events.subtitle" },
  { key: "reports", icon: BarChart3, roles: ["SUPER_ADMIN", "ADMIN"], labelKey: "nav.reports", descKey: "reports.subtitle" },
  { key: "audit", icon: History, roles: ["SUPER_ADMIN"], labelKey: "nav.audit", descKey: "audit.subtitle" },
  { key: "settings", icon: Settings, roles: ["SUPER_ADMIN"], labelKey: "nav.settings", descKey: "settings.subtitle" },
  { key: "profile", icon: UserCircle, roles: ["SUPER_ADMIN", "ADMIN", "MEMBER"], labelKey: "nav.myProfile", descKey: "profile.description" },
];

interface AppShellProps {
  currentView: ViewKey;
  onNavigate: (view: ViewKey) => void;
  children: React.ReactNode;
}

function NavList({
  items,
  currentView,
  onNavigate,
  onSelect,
  t,
  pendingSkills,
}: {
  items: NavItem[];
  currentView: ViewKey;
  onNavigate: (v: ViewKey) => void;
  onSelect?: () => void;
  t: (k: string, p?: Record<string, string | number>) => string;
  pendingSkills?: number;
}) {
  return (
    <nav className="flex flex-col gap-1 px-3 py-4">
      {items.map((item) => {
        const Icon = item.icon;
        const active = currentView === item.key;
        return (
          <button
            key={item.key}
            onClick={() => {
              onNavigate(item.key);
              onSelect?.();
            }}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150",
              active
                ? "nav-item-active"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            )}
            title={t(item.descKey)}
          >
            <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
            <span className="truncate">{t(item.labelKey)}</span>
            {item.key === "skills" && pendingSkills && pendingSkills > 0 ? (
              <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-[10px] bg-amber-500/15 text-amber-600">
                {pendingSkills}
              </Badge>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

export function AppShell({ currentView, onNavigate, children }: AppShellProps) {
  const { user, member, signOut } = useAuth();
  const { t, locale } = useI18n();
  const { resolvedTheme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingSkills, setPendingSkills] = useState(0);

  // Poll notifications + pending skills
  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = async () => {
      try {
        const [notifRes, skillsRes] = await Promise.all([
          fetch("/api/notifications?unreadOnly=true", { cache: "no-store" }),
          (user.role === "SUPER_ADMIN" || user.role === "ADMIN")
            ? fetch("/api/member-skills?status=PENDING", { cache: "no-store" })
            : Promise.resolve(null),
        ]);
        const notifJson = await notifRes.json();
        if (active && notifJson.success) setUnreadCount(notifJson.data.unreadCount ?? 0);
        if (skillsRes && skillsRes.ok) {
          const skillsJson = await skillsRes.json();
          if (active && skillsJson.success) {
            const items = skillsJson.data?.items ?? [];
            setPendingSkills(items.length);
          }
        }
      } catch { /* ignore */ }
    };
    load();
    const timer = setInterval(load, 30_000);
    return () => { active = false; clearInterval(timer); };
  }, [user]);

  if (!user) return null;

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role));
  const currentNav = NAV_ITEMS.find((n) => n.key === currentView);
  const roleLabel = locale === "sw"
    ? (user.role === "SUPER_ADMIN" ? "Msimamizi Mkuu" : user.role === "ADMIN" ? "Msimamizi" : "Mwanachama")
    : ROLE_LABELS[user.role];

  const handleSignOut = async () => {
    await signOut();
    toast.success(t("auth.signedOut"));
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="h-16 flex items-center gap-2.5 px-6 border-b border-sidebar-border">
          <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="font-serif text-sm tracking-wide">CASFETA</p>
            <p className="text-[10px] text-muted-foreground">{t("common.orgName")}</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavList
            items={visibleItems}
            currentView={currentView}
            onNavigate={onNavigate}
            t={t}
            pendingSkills={pendingSkills}
          />
        </div>
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-lg p-2">
            <Avatar className="h-9 w-9">
              {member?.profilePhoto ? (
                <AvatarImage src={member.profilePhoto} alt={member?.fullName ?? user.name} className="object-cover" />
              ) : null}
              <AvatarFallback className="bg-primary/15 text-primary text-xs font-medium">
                {initials(member?.fullName ?? user.name ?? user.username)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{member?.fullName ?? user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{roleLabel}</p>
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSignOut} title={t("auth.signOut")}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar (Sheet) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0 bg-sidebar">
          <SheetTitle className="sr-only">{t("common.appName")}</SheetTitle>
          <div className="h-16 flex items-center gap-2.5 px-6 border-b border-sidebar-border">
            <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="font-serif text-sm tracking-wide">CASFETA</p>
              <p className="text-[10px] text-muted-foreground">{t("common.orgName")}</p>
            </div>
          </div>
          <NavList
            items={visibleItems}
            currentView={currentView}
            onNavigate={onNavigate}
            onSelect={() => setMobileOpen(false)}
            t={t}
            pendingSkills={pendingSkills}
          />
        </SheetContent>
      </Sheet>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 px-4 lg:px-6">
          {/* Mobile menu trigger */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="hidden sm:block">
            <h1 className="text-lg font-semibold leading-tight">{currentNav ? t(currentNav.labelKey) : ""}</h1>
            <p className="text-xs text-muted-foreground">{currentNav ? t(currentNav.descKey) : ""}</p>
          </div>

          <div className="flex-1" />

          {/* Network status indicator */}
          <div className="hidden md:flex">
            <NetworkStatus />
          </div>

          {/* Language switcher */}
          <LanguageSwitcher />

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            title={t("auth.showPassword") === "Onesha nenosiri" ? "Badilisha mandhari" : "Toggle theme"}
          >
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative" title={t("nav.announcements")} asChild>
            <Link href="#" onClick={(e) => { e.preventDefault(); onNavigate("announcements"); }}>
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-4 min-w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-10 px-2 gap-2">
                <Avatar className="h-7 w-7">
                  {member?.profilePhoto ? (
                    <AvatarImage src={member.profilePhoto} alt={member?.fullName ?? user.name} className="object-cover" />
                  ) : null}
                  <AvatarFallback className="bg-primary/15 text-primary text-xs font-medium">
                    {initials(member?.fullName ?? user.name ?? user.username)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:inline text-sm font-medium max-w-32 truncate">
                  {member?.fullName ?? user.name}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{member?.fullName ?? user.name}</span>
                  <span className="text-xs text-muted-foreground font-normal">{user.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={() => onNavigate("profile")}>
                <UserCircle className="mr-2 h-4 w-4" />
                {t("nav.myProfile")}
              </DropdownMenuItem>
              {user.role === "SUPER_ADMIN" && (
                <DropdownMenuItem className="cursor-pointer" onClick={() => onNavigate("settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  {t("nav.settings")}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                {t("auth.signOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 lg:px-6 py-6 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
