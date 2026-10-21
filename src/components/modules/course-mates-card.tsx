"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { GraduationCap, Users, Phone, MapPin, BookOpen, Building2 } from "lucide-react";
import { api, initials, label } from "@/lib/utils/client";
import { useI18n } from "@/components/providers/i18n-provider";

type RelationTag = "coursemate" | "roommate" | "faculty";
type MatchType = "course" | "hostel" | "faculty" | null;

interface Suggestion {
  id: string;
  fullName: string;
  regNumber: string;
  course: string;
  faculty: string;
  yearOfStudy: string;
  phoneNumber: string;
  email: string | null;
  profilePhoto: string | null;
  hostel: string | null;
  relationTag: RelationTag;
}

interface ApiResponse {
  items: Suggestion[];
  matchType: MatchType;
  matchValue: string | null;
}

// ─── relation badge config ────────────────────────────────────────────────────
const RELATION_CONFIG: Record<RelationTag, { label: string; labelSw: string; color: string; Icon: React.ComponentType<{ className?: string }> }> = {
  coursemate: {
    label: "Coursemate",
    labelSw: "Mwenzako wa Kozi",
    color: "bg-primary/10 text-primary",
    Icon: GraduationCap,
  },
  roommate: {
    label: "Same Hostel",
    labelSw: "Nyumba Moja",
    color: "bg-amber-500/10 text-amber-600",
    Icon: MapPin,
  },
  faculty: {
    label: "Same Faculty",
    labelSw: "Kitivo Kimoja",
    color: "bg-emerald-500/10 text-emerald-700",
    Icon: Building2,
  },
};

const SECTION_CONFIG: Record<NonNullable<MatchType>, { titleEn: string; titleSw: string; descEn: (v: string) => string; descSw: (v: string) => string; Icon: React.ComponentType<{ className?: string }> }> = {
  course: {
    titleEn: "Course Mates",
    titleSw: "Wenzako wa Kozi",
    descEn: (v) => `Members studying ${v}`,
    descSw: (v) => `Wanachama wanaosoma ${v}`,
    Icon: GraduationCap,
  },
  hostel: {
    titleEn: "Hostel Mates",
    titleSw: "Wenzako wa Nyumba",
    descEn: (v) => `Members staying at ${v}`,
    descSw: (v) => `Wanachama wanaoishi ${v}`,
    Icon: MapPin,
  },
  faculty: {
    titleEn: "Faculty Peers",
    titleSw: "Wenzako wa Kitivo",
    descEn: (v) => `Members in ${v}`,
    descSw: (v) => `Wanachama wa ${v}`,
    Icon: Building2,
  },
};

export function CourseMatesCard() {
  const { t, locale } = useI18n();
  const isSw = locale === "sw";
  const [items, setItems] = useState<Suggestion[]>([]);
  const [matchType, setMatchType] = useState<MatchType>(null);
  const [matchValue, setMatchValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<ApiResponse>("/api/members/course-mates")
      .then((res) => {
        setItems(res.items ?? []);
        setMatchType(res.matchType ?? null);
        setMatchValue(res.matchValue ?? null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-1" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  // Nothing to show — member profile not complete enough to match anyone
  if (!matchType || items.length === 0) {
    return (
      <Card className="shadow-sm border border-border/70">
        <CardContent className="py-10 text-center">
          <Users className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            {isSw ? "Hakuna mapendekezo bado" : "No suggestions yet"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {isSw
              ? "Jaza taarifa zako (kozi, nyumba, kitivo) ili kupata mapendekezo"
              : "Complete your profile (course, hostel, faculty) to get suggestions"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const section = SECTION_CONFIG[matchType];
  const SectionIcon = section.Icon;

  return (
    <Card className="shadow-sm border border-border/70 overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 via-accent/5 to-transparent">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base font-serif flex items-center gap-2">
              <SectionIcon className="h-5 w-5 text-primary" />
              {isSw ? section.titleSw : section.titleEn}
            </CardTitle>
            <CardDescription className="text-xs">
              {isSw
                ? section.descSw(matchValue ?? "")
                : section.descEn(matchValue ?? "")}
            </CardDescription>
          </div>
          {matchValue && (
            <Badge variant="secondary" className="bg-primary/10 text-primary text-[11px] shrink-0 font-medium max-w-[140px] truncate">
              {matchValue}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <div className="grid sm:grid-cols-2 gap-3">
          {items.map((m) => {
            const rel = RELATION_CONFIG[m.relationTag];
            const RelIcon = rel.Icon;
            return (
              <div
                key={m.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-card hover:bg-accent/40 transition-colors"
              >
                <Avatar className="h-10 w-10 border border-primary/20 shrink-0">
                  {m.profilePhoto ? <AvatarImage src={m.profilePhoto} alt={m.fullName} /> : null}
                  <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                    {initials(m.fullName)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-semibold truncate text-foreground">{m.fullName}</p>
                    <Badge variant="outline" className="text-[9px] py-0 px-1.5 shrink-0 bg-background">
                      {label(t, "year", m.yearOfStudy)}
                    </Badge>
                  </div>

                  {/* Relation tag */}
                  <span className={`inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-1.5 py-0.5 ${rel.color}`}>
                    <RelIcon className="h-2.5 w-2.5" />
                    {isSw ? rel.labelSw : rel.label}
                  </span>

                  {/* Course (shown for roommate/faculty suggestions) */}
                  {m.relationTag !== "coursemate" && m.course && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                      <BookOpen className="h-2.5 w-2.5 shrink-0" />
                      {m.course}
                    </p>
                  )}

                  {/* Hostel (shown for coursemate/faculty suggestions) */}
                  {m.relationTag !== "roommate" && m.hostel && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                      <MapPin className="h-2.5 w-2.5 shrink-0 text-amber-500" />
                      {m.hostel}
                    </p>
                  )}

                  {/* Phone */}
                  {m.phoneNumber && (
                    <a
                      href={`tel:${m.phoneNumber}`}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors w-fit"
                    >
                      <Phone className="h-2.5 w-2.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{m.phoneNumber}</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
