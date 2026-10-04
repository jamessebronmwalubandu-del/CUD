"use client";

import { useEffect, useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, X, Users, Mail, Phone, MapPin, Award } from "lucide-react";
import { api, label, initials, formatDate } from "@/lib/utils/client";
import type { Member } from "@/types";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useI18n } from "@/components/providers/i18n-provider";

export function DirectoryView() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState<Member | null>(null);

  // Load initial members
  useEffect(() => {
    setLoading(true);
    api
      .get<{ items: Member[] }>("/api/members?pageSize=100")
      .then((d) => setAllMembers(d.items ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Search via API when query has 2+ chars, else show all
  useEffect(() => {
    if (!query.trim()) {
      setResults(allMembers);
      return;
    }
    if (query.trim().length < 2) return;
    const debounce = setTimeout(async () => {
      setLoading(true);
      try {
        const d = await api.get<{ items: Member[] }>(`/api/members/search?q=${encodeURIComponent(query)}&limit=30`);
        setResults(d.items ?? []);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(debounce);
  }, [query, allMembers]);

  const stats = useMemo(() => {
    const active = results.filter((m) => m.status === "ACTIVE").length;
    const males = results.filter((m) => m.gender === "MALE").length;
    const females = results.filter((m) => m.gender === "FEMALE").length;
    return { total: results.length, active, males, females };
  }, [results]);

  return (
    <div className="space-y-6">
      {/* Search hero */}
      <Card className="border-0 bg-gradient-to-br from-card to-secondary/30">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-serif tracking-tight flex items-center gap-2">
                <Search className="h-6 w-6 text-primary" /> {t("directory.title")}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t("directory.description")}
              </p>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                autoFocus
                placeholder={t("directory.placeholder")}
                className="pl-12 pr-12 h-12 text-base shadow-sm"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 inline-flex items-center justify-center rounded-full hover:bg-accent"
                  aria-label={t("common.clear")}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                <Users className="h-3 w-3 mr-1" /> {stats.total} {t("directory.shown")}
              </Badge>
              <Badge variant="secondary">{stats.active} {t("common.active").toLowerCase()}</Badge>
              <Badge variant="secondary">{t("directory.maleFemale", { m: stats.males, f: stats.females })}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <EmptyState query={query} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((m) => (
            <MemberCard key={m.id} member={m} onClick={() => setSelected(m)} />
          ))}
        </div>
      )}

      {/* Profile dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selected && <MemberProfile member={selected} />}
        </DialogContent>
      </Dialog>
    </div>
  );

  function EmptyState({ query }: { query: string }) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Search className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <p className="mt-3 font-medium">{t("directory.noResults")}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {query ? t("directory.noResultsQuery", { q: query }) : t("directory.noResultsEmpty")}
          </p>
        </CardContent>
      </Card>
    );
  }

  function MemberCard({ member, onClick }: { member: Member; onClick: () => void }) {
    return (
      <Card
        onClick={onClick}
        className="cursor-pointer card-hover overflow-hidden"
      >
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <Avatar className="h-14 w-14 border">
              {member.profilePhoto ? (
                <AvatarImage src={member.profilePhoto} alt={member.fullName} className="object-cover" />
              ) : null}
              <AvatarFallback className="bg-primary/15 text-primary font-medium">
                {initials(member.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-tight truncate">{member.fullName}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{member.regNumber}</p>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <Badge variant="outline" className="text-[10px]">{label(t, "year", member.yearOfStudy)}</Badge>
                <Badge
                  variant={member.status === "ACTIVE" ? "secondary" : "outline"}
                  className="text-[10px] bg-primary/10 text-primary border-primary/20"
                >
                  {label(t, "status", member.status)}
                </Badge>
              </div>
            </div>
          </div>
          <div className="mt-3 space-y-1 text-xs text-muted-foreground">
            <p className="truncate">{member.course}</p>
            {member.hostel && <p className="truncate"><MapPin className="inline h-3 w-3 mr-1" />{member.hostel}</p>}
            {member.ministries && member.ministries.length > 0 && (
              <p className="truncate"><Award className="inline h-3 w-3 mr-1" />
                {member.ministries.map((mm) => mm.ministry.name).join(", ")}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  function MemberProfile({ member }: { member: Member }) {
    return (
      <div className="space-y-5">
        <DialogHeader>
          <DialogTitle>{t("directory.profile")}</DialogTitle>
          <DialogDescription>{t("directory.profileDesc", { name: member.fullName })}</DialogDescription>
        </DialogHeader>
        <div className="flex items-start gap-4">
          <Avatar className="h-20 w-20 border">
            {member.profilePhoto ? (
              <AvatarImage src={member.profilePhoto} alt={member.fullName} className="object-cover" />
            ) : null}
            <AvatarFallback className="bg-primary/15 text-primary text-xl font-medium">
              {initials(member.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="text-xl font-serif tracking-tight">{member.fullName}</h3>
            <p className="text-sm text-muted-foreground">{member.regNumber}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge variant="secondary">{label(t, "gender", member.gender)}</Badge>
              <Badge variant="secondary">{label(t, "year", member.yearOfStudy)}</Badge>
              <Badge className="bg-primary/10 text-primary border-primary/20" variant="outline">
                {label(t, "status", member.status)}
              </Badge>
            </div>
          </div>
        </div>

        {member.biography && (
          <p className="text-sm italic text-muted-foreground border-l-2 border-primary/30 pl-3">
            {member.biography}
          </p>
        )}

        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <InfoRow icon={Mail} label={t("common.email")} value={member.email ?? "—"} />
          <InfoRow icon={Phone} label={t("common.phone")} value={member.phoneNumber} />
          <InfoRow icon={MapPin} label={t("members.hostel")} value={member.hostel ?? "—"} />
          <InfoRow icon={MapPin} label={t("members.homeRegion")} value={member.homeRegion ?? "—"} />
          <InfoRow icon={Users} label={t("members.faculty")} value={member.faculty} />
          <InfoRow icon={Users} label={t("members.department")} value={member.department} />
          <InfoRow icon={Users} label={t("members.course")} value={member.course} />
          <InfoRow icon={Phone} label={t("directory.emergency")} value={member.emergencyContact ?? "—"} />
          <InfoRow icon={Users} label={t("directory.joined")} value={formatDate(member.joinedAt, { year: "numeric", month: "short", day: "numeric" })} />
        </div>

        {member.ministries && member.ministries.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("directory.ministries")}</p>
            <div className="flex flex-wrap gap-2">
              {member.ministries.map((mm) => (
                <Badge
                  key={mm.id}
                  style={{
                    backgroundColor: `${mm.ministry.color ?? "#0f766e"}20`,
                    color: mm.ministry.color ?? "#0f766e",
                    borderColor: `${mm.ministry.color ?? "#0f766e"}40`,
                  }}
                  variant="outline"
                >
                  {mm.ministry.name} · {label(t, "ministryRole", mm.role)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {member.skills && member.skills.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("directory.skills")}</p>
            <div className="flex flex-wrap gap-2">
              {member.skills.map((ms) => (
                <Badge
                  key={ms.id}
                  variant={ms.status === "APPROVED" ? "default" : ms.status === "PENDING" ? "outline" : "destructive"}
                  className={ms.status === "APPROVED" ? "bg-primary/15 text-primary" : ""}
                >
                  {ms.skill.name}
                  {ms.proficiency && <span className="ml-1 opacity-70 text-[10px]">· {label(t, "proficiency", ms.proficiency)}</span>}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  function InfoRow({ icon: Icon, label: lbl, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-border/50 p-2.5">
        <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{lbl}</p>
          <p className="font-medium truncate">{value}</p>
        </div>
      </div>
    );
  }
}
