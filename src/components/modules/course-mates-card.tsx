"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { GraduationCap, Users, Phone, Mail, MapPin, Sparkles } from "lucide-react";
import { api, initials, label } from "@/lib/utils/client";
import { useI18n } from "@/components/providers/i18n-provider";
import type { Member } from "@/types";

interface CourseMate {
  id: string;
  fullName: string;
  regNumber: string;
  course: string;
  yearOfStudy: string;
  phoneNumber: string;
  email: string | null;
  profilePhoto: string | null;
  hostel: string | null;
}

export function CourseMatesCard() {
  const { t } = useI18n();
  const [mates, setMates] = useState<CourseMate[]>([]);
  const [targetCourse, setTargetCourse] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ items: CourseMate[]; targetCourse: string | null; isFallback: boolean }>("/api/members/course-mates")
      .then((res) => {
        setMates(res.items ?? []);
        setTargetCourse(res.targetCourse);
        setIsFallback(res.isFallback);
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

  return (
    <Card className="shadow-sm border border-border/70 overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 via-accent/5 to-transparent">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base font-serif flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" /> Wenzako wa Kozi Moja ({targetCourse || "Kozi Yako"})
            </CardTitle>
            <CardDescription className="text-xs">
              {isFallback
                ? "Bado hakuna mwingine aliyesajili kozi hii kabisa. Hawa hapa wanachama wengine wa ushirika wa kuungana nao:"
                : `Wanachama wanaosoma kozi ya ${targetCourse} katika chuo kikuu.`}
            </CardDescription>
          </div>
          {targetCourse && (
            <Badge variant="secondary" className="bg-primary/10 text-primary text-[11px] shrink-0 font-medium">
              {targetCourse}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {mates.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>Bado hakuna wanachama wengine waliojaza kozi hii.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {mates.map((m) => (
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

                  <p className="text-[11px] text-muted-foreground truncate">{m.course}</p>

                  <div className="flex items-center gap-3 pt-1 text-[11px] text-muted-foreground">
                    {m.phoneNumber && (
                      <a href={`tel:${m.phoneNumber}`} className="flex items-center gap-1 hover:text-primary">
                        <Phone className="h-3 w-3 text-emerald-600" />
                        <span className="truncate">{m.phoneNumber}</span>
                      </a>
                    )}
                    {m.hostel && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3 text-amber-600 shrink-0" />
                        <span className="truncate">{m.hostel}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
