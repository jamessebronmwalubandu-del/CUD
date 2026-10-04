"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { LoginForm } from "@/components/auth/login-form";
import { AppShell, type ViewKey } from "@/components/layout/app-shell";
import { DashboardHome } from "@/components/modules/dashboard-home";
import { DirectoryView } from "@/components/modules/directory-view";
import { MembersView } from "@/components/modules/members-view";
import { SkillsView } from "@/components/modules/skills-view";
import { MinistriesView } from "@/components/modules/ministries-view";
import { AttendanceView } from "@/components/modules/attendance-view";
import { DocumentsView } from "@/components/modules/documents-view";
import { AnnouncementsView } from "@/components/modules/announcements-view";
import { EventsView } from "@/components/modules/events-view";
import { ReportsView } from "@/components/modules/reports-view";
import { AuditView } from "@/components/modules/audit-view";
import { SettingsView } from "@/components/modules/settings-view";
import { ProfileView } from "@/components/modules/profile-view";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";

export default function Home() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<ViewKey>("dashboard");

  // Register service worker for offline support
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => console.warn("[SW] registration failed:", err));
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 w-full max-w-md p-6">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-4 w-72 mx-auto" />
          <div className="pt-8 space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <AppShell currentView={view} onNavigate={setView}>
      {view === "dashboard" && <DashboardHome onNavigate={setView} />}
      {view === "directory" && <DirectoryView />}
      {view === "members" && <MembersView />}
      {view === "skills" && <SkillsView />}
      {view === "ministries" && <MinistriesView />}
      {view === "attendance" && <AttendanceView />}
      {view === "documents" && <DocumentsView />}
      {view === "announcements" && <AnnouncementsView />}
      {view === "events" && <EventsView />}
      {view === "reports" && <ReportsView />}
      {view === "audit" && <AuditView />}
      {view === "settings" && <SettingsView />}
      {view === "profile" && <ProfileView />}
    </AppShell>
  );
}
