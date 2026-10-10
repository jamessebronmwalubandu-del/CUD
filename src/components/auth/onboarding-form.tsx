"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  FileText, CheckCircle2, User, Church, GraduationCap, MapPin, Send, AlertCircle, ShieldCheck, HeartHandshake,
  Search, Check, Sparkles, Handshake, Users,
} from "lucide-react";
import { UDSM_COLLEGES, ALL_UDSM_PROGRAMMES, type UDSMCollege } from "@/lib/data/udsm-programmes";
import { useAuth } from "@/components/providers/auth-provider";
import { toast } from "sonner";

/** Helper component to highlight search terms */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-amber-300/80 dark:bg-amber-500/40 text-foreground font-semibold px-0.5 rounded">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

export function OnboardingForm() {
  const { user, member, refresh } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  // Membership Category: "FULL" (Mwanachama Kamili) | "ASSOCIATE" (Mwanachama Mshiriki)
  const [membershipCategory, setMembershipCategory] = useState<"FULL" | "ASSOCIATE">("FULL");

  // 1. Personal particulars
  const [fullName, setFullName] = useState(member?.fullName || user?.name || "");
  const [regNumber, setRegNumber] = useState(member?.regNumber?.startsWith("CUD/") ? "" : (member?.regNumber || ""));
  const [gender, setGender] = useState<"MALE" | "FEMALE">(member?.gender === "FEMALE" ? "FEMALE" : "MALE");
  const [maritalStatus, setMaritalStatus] = useState("SINGLE");
  const [phoneNumber, setPhoneNumber] = useState(member?.phoneNumber === "Not provided" ? "" : (member?.phoneNumber || ""));
  const [email, setEmail] = useState(member?.email || user?.email || "");
  const [homeAddress, setHomeAddress] = useState(member?.homeRegion || "");

  // 2. Religious particulars
  const [isBornAgain, setIsBornAgain] = useState("YES");
  const [bornAgainWhen, setBornAgainWhen] = useState("");
  const [isBaptized, setIsBaptized] = useState("YES");
  const [baptizedWhen, setBaptizedWhen] = useState("");
  const [denomination, setDenomination] = useState("");
  const [casfetaDiscovery, setCasfetaDiscovery] = useState("");
  const [firstJoinDate, setFirstJoinDate] = useState("");
  const [firstJoinLevel, setFirstJoinLevel] = useState("");
  const [firstJoinSchool, setFirstJoinSchool] = useState("");
  const [previousPosition, setPreviousPosition] = useState("");
  const [spiritualGifts, setSpiritualGifts] = useState("");

  // 3. Admitting details
  const [yearOfStudy, setYearOfStudy] = useState("YEAR_1");
  const [studyLevel, setStudyLevel] = useState("BACHELOR");
  const [selectedCollegeCode, setSelectedCollegeCode] = useState("CoICT");
  const [program, setProgram] = useState("BSc in Computer Science");
  const [customProgram, setCustomProgram] = useState("");
  const [courseSearch, setCourseSearch] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("ALL");
  const [accommodationType, setAccommodationType] = useState("MABIBO_HOSTEL");
  const [block, setBlock] = useState("");
  const [roomNo, setRoomNo] = useState("");
  const [offCampusLocation, setOffCampusLocation] = useState("");

  // 4. Declaration
  const [declarationSigned, setDeclarationSigned] = useState(false);

  // Filter programmes dynamically based on search query and college filter
  const filteredProgrammes = useMemo(() => {
    let list = ALL_UDSM_PROGRAMMES;
    if (collegeFilter !== "ALL") {
      list = list.filter((p) => p.collegeCode === collegeFilter);
    }
    if (courseSearch.trim()) {
      const q = courseSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.programme.toLowerCase().includes(q) ||
          p.collegeCode.toLowerCase().includes(q) ||
          p.collegeName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [courseSearch, collegeFilter]);

  // Handle course selection
  const handleSelectCourse = (pName: string, cCode: string) => {
    setProgram(pName);
    setSelectedCollegeCode(cCode);
    toast.success(`Umechagua: ${pName} (${cCode})`);
  };

  // When study level changes, auto-suggest membership type
  const handleStudyLevelChange = (level: string) => {
    setStudyLevel(level);
    if (level === "MASTERS" || level === "PHD" || level === "OTHER") {
      setMembershipCategory("ASSOCIATE");
      toast.info("Umechagua ngazi ya Uzamili/Uzamivu. Aina ya uanachama imewekwa kama Mwanachama Mshiriki (Associate Member).");
    } else if (level === "BACHELOR" || level === "DIPLOMA" || level === "CERTIFICATE") {
      setMembershipCategory("FULL");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error("Tafadhali jaza jina lako kamili.");
      return;
    }
    if (!regNumber.trim()) {
      toast.error("Tafadhali jaza namba yako ya usajili wa chuo (Registration number).");
      return;
    }
    if (!phoneNumber.trim()) {
      toast.error("Tafadhali jaza namba yako ya simu.");
      return;
    }
    const finalProgram = program === "OTHER" ? customProgram.trim() : program;
    if (!finalProgram) {
      toast.error("Tafadhali chagua au jaza kozi/program unayosoma.");
      return;
    }
    if (!declarationSigned) {
      toast.error("Tafadhali weka alama ya vema kwenye tamko la uanachama wa CASFETA UDSM kabla ya kuendelea.");
      return;
    }

    setSubmitting(true);
    try {
      const col = UDSM_COLLEGES.find((c) => c.code === selectedCollegeCode) || UDSM_COLLEGES[0];
      const res = await fetch("/api/members/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          regNumber,
          gender,
          maritalStatus,
          membershipCategory, // "FULL" or "ASSOCIATE"
          phoneNumber,
          email,
          homeAddress,
          isBornAgain,
          bornAgainWhen,
          isBaptized,
          baptizedWhen,
          denomination,
          casfetaDiscovery,
          firstJoinDate,
          firstJoinLevel,
          firstJoinSchool,
          previousPosition,
          spiritualGifts,
          yearOfStudy,
          studyLevel,
          program: finalProgram,
          college: col.code,
          department: col.name,
          accommodationType,
          block,
          roomNo,
          offCampusLocation,
          declarationSigned,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || "Hitilafu imetokea wakati wa kuhifadhi.");
      }

      toast.success(data.message || "Usajili umekamilika kikamilifu!");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Imeshindwa kukamilisha usajili.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4 flex flex-col items-center justify-center">
      <div className="max-w-4xl w-full space-y-6">
        {/* Formal Header Card */}
        <Card className="border-t-4 border-t-primary shadow-lg overflow-hidden">
          <CardHeader className="text-center pb-4 pt-6 bg-gradient-to-b from-primary/5 via-transparent to-transparent">
            <div className="flex justify-center mb-2">
              <img
                src="/logo.png"
                alt="CASFETA CUD"
                className="h-16 w-16 rounded-2xl object-contain shadow-md ring-2 ring-primary/25 bg-slate-950 p-1"
              />
            </div>
            <p className="text-xs uppercase font-bold tracking-widest text-primary/80">
              The Christ’s Ambassadors Students Fellowship Tanzania
            </p>
            <CardTitle className="text-2xl sm:text-3xl font-serif font-bold text-foreground">
              CASFETA UDSM
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm max-w-xl mx-auto pt-1 font-medium text-muted-foreground">
              MEMBERSHIP REGISTRATION FORM / FOMU YA USAJIRI WA MWANACHAMA
            </CardDescription>
            <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-300/40 text-amber-900 dark:text-amber-200 text-xs text-left sm:text-center flex items-center justify-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>
                <strong>Hatua ya Lazima:</strong> Ili kufanya akaunti yako kuwa hai kama mwanachama rasmi wa CASFETA UDSM, tafadhali jaza fomu hii kikamilifu. Utafunguliwa mfumo mara moja baada ya kubonyeza kitufe cha kukamilisha usajili.
              </span>
            </div>
          </CardHeader>
        </Card>

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Membership Type Selection */}
          <Card className="shadow-md border-primary/20">
            <CardHeader className="border-b bg-card py-3.5">
              <CardTitle className="text-sm font-serif flex items-center gap-2 text-primary">
                <Handshake className="h-4 w-4" /> AINA YA UANACHAMA / MEMBERSHIP CATEGORY
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <RadioGroup
                value={membershipCategory}
                onValueChange={(v) => setMembershipCategory(v as "FULL" | "ASSOCIATE")}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                <div
                  onClick={() => setMembershipCategory("FULL")}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                    membershipCategory === "FULL"
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border/70 hover:border-primary/40 bg-card"
                  }`}
                >
                  <RadioGroupItem value="FULL" id="mem-full" className="mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor="mem-full" className="font-semibold text-sm cursor-pointer flex items-center gap-1.5">
                      <GraduationCap className="h-4 w-4 text-primary" /> Mwanachama Kamili (Full Member)
                    </Label>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Kwa wanafunzi wote wanaosoma masomo ya Shahada ya Kwanza (Bachelor), Stashahada (Diploma), au Astashahada chuoni.
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setMembershipCategory("ASSOCIATE")}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                    membershipCategory === "ASSOCIATE"
                      ? "border-purple-500 bg-purple-500/10 shadow-sm"
                      : "border-border/70 hover:border-purple-300 bg-card"
                  }`}
                >
                  <RadioGroupItem value="ASSOCIATE" id="mem-associate" className="mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor="mem-associate" className="font-semibold text-sm cursor-pointer flex items-center gap-1.5 text-purple-700 dark:text-purple-300">
                      <Handshake className="h-4 w-4 text-purple-600" /> Mwanachama Mshiriki (Associate Member)
                    </Label>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Kwa wanafunzi wa Uzamili (Masters), Uzamivu (PhD), Wahitimu (Alumni), Wafanyakazi, au Washiriki wa nje.
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Section 1: Personal Particulars */}
          <Card className="shadow-md">
            <CardHeader className="border-b bg-card py-4">
              <CardTitle className="text-base font-serif flex items-center gap-2 text-primary">
                <User className="h-5 w-5" /> 1. TAARIFA BINAFSI / PERSONAL PARTICULARS
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Registration Number / Namba ya Usajili ya Chuo <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    placeholder="Mfano: 2024-04-12345 au 2023-04-00123"
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Full Name / Jina Kamili <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    placeholder="Jina lako kamili kama lilivyo chuoni"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Jinsia / Gender</Label>
                  <RadioGroup
                    value={gender}
                    onValueChange={(v) => setGender(v as "MALE" | "FEMALE")}
                    className="flex items-center gap-6 pt-1"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="MALE" id="gender-male" />
                      <Label htmlFor="gender-male" className="cursor-pointer text-xs font-medium">Male / Me</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="FEMALE" id="gender-female" />
                      <Label htmlFor="gender-female" className="cursor-pointer text-xs font-medium">Female / Ke</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Hali ya Ndoa / Marital Status</Label>
                  <Select value={maritalStatus} onValueChange={setMaritalStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SINGLE">Not Married / Sijaoa / Sijaolewa</SelectItem>
                      <SelectItem value="MARRIED">Married / Nimeoa / Nimeolewa</SelectItem>
                      <SelectItem value="IN_RELATIONSHIP">In relationship / Uchumba</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Namba ya Simu / Mobile Number <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    placeholder="Mfano: +255 759 000 000"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Barua Pepe / Email Address</Label>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Anuani ya Nyumbani / Home Address</Label>
                <Input
                  placeholder="Mfano: Mbeya mjini, Arusha, Mwanza n.k."
                  value={homeAddress}
                  onChange={(e) => setHomeAddress(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Religious Particulars */}
          <Card className="shadow-md">
            <CardHeader className="border-b bg-card py-4">
              <CardTitle className="text-base font-serif flex items-center gap-2 text-primary">
                <Church className="h-5 w-5" /> 2. TAARIFA ZA KIROHO / RELIGIOUS PARTICULARS
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Umeokoka? / Are you born again?</Label>
                  <div className="flex items-center gap-4 pt-1">
                    <Select value={isBornAgain} onValueChange={setIsBornAgain}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="YES">Yes / Ndiyo</SelectItem>
                        <SelectItem value="NOT_YET">Not yet / Bado</SelectItem>
                      </SelectContent>
                    </Select>
                    {isBornAgain === "YES" && (
                      <Input
                        placeholder="Mwaka / Lini (When)"
                        value={bornAgainWhen}
                        onChange={(e) => setBornAgainWhen(e.target.value)}
                        className="flex-1"
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Umebatizwa? / Are you baptized?</Label>
                  <div className="flex items-center gap-4 pt-1">
                    <Select value={isBaptized} onValueChange={setIsBaptized}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="YES">Yes / Ndiyo</SelectItem>
                        <SelectItem value="NOT_YET">Not yet / Bado</SelectItem>
                      </SelectContent>
                    </Select>
                    {isBaptized === "YES" && (
                      <Input
                        placeholder="Mwaka / Lini (When)"
                        value={baptizedWhen}
                        onChange={(e) => setBaptizedWhen(e.target.value)}
                        className="flex-1"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Dhehebu / Denomination</Label>
                  <Input
                    placeholder="Mfano: T.A.G, FPCT, EAGT, Lutheran, Moravian..."
                    value={denomination}
                    onChange={(e) => setDenomination(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Uliifahamu CASFETA lini?</Label>
                  <Input
                    placeholder="Mfano: Mwaka 2022, Kupitia rafiki, O-level..."
                    value={casfetaDiscovery}
                    onChange={(e) => setCasfetaDiscovery(e.target.value)}
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-lg border bg-muted/20 space-y-3">
                <Label className="text-xs font-semibold text-foreground">
                  Ulijiunga lini na CASFETA kwa mara ya kwanza? (First Joined CASFETA)
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    placeholder="Tarehe / Mwaka (Date)"
                    value={firstJoinDate}
                    onChange={(e) => setFirstJoinDate(e.target.value)}
                    className="text-xs"
                  />
                  <Input
                    placeholder="Kidato / Darasa (Level)"
                    value={firstJoinLevel}
                    onChange={(e) => setFirstJoinLevel(e.target.value)}
                    className="text-xs"
                  />
                  <Input
                    placeholder="Shule / Taasisi (School)"
                    value={firstJoinSchool}
                    onChange={(e) => setFirstJoinSchool(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Nafasi yako kwenye CASFETA hapo awali</Label>
                  <Input
                    placeholder="Mfano: Kiongozi wa Maombi, Mhazini, Mwanachama..."
                    value={previousPosition}
                    onChange={(e) => setPreviousPosition(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Karama / Karama yako (Your gift)</Label>
                  <Input
                    placeholder="Mfano: Uimbaji, Kinanda, Gitaa, Ualimu wa Neno..."
                    value={spiritualGifts}
                    onChange={(e) => setSpiritualGifts(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Admitting Details & Course Picker */}
          <Card className="shadow-md">
            <CardHeader className="border-b bg-card py-4">
              <CardTitle className="text-base font-serif flex items-center gap-2 text-primary">
                <GraduationCap className="h-5 w-5" /> 3. TAARIFA ZA UDAHILI / ADMITTING DETAILS
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Mwaka wa Masomo / Year of Study <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={yearOfStudy} onValueChange={setYearOfStudy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="YEAR_1">Mwaka wa 1 (First Year)</SelectItem>
                      <SelectItem value="YEAR_2">Mwaka wa 2 (Second Year)</SelectItem>
                      <SelectItem value="YEAR_3">Mwaka wa 3 (Third Year)</SelectItem>
                      <SelectItem value="YEAR_4">Mwaka wa 4 (Fourth Year)</SelectItem>
                      <SelectItem value="YEAR_5">Mwaka wa 5 (Fifth Year)</SelectItem>
                      <SelectItem value="ASSOCIATE">Mhitimu / Postgraduate / Associate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Ngazi ya Masomo / Study Level</Label>
                  <Select value={studyLevel} onValueChange={handleStudyLevelChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BACHELOR">Bachelor / Shahada ya Kwanza</SelectItem>
                      <SelectItem value="DIPLOMA">Diploma / Stashahada</SelectItem>
                      <SelectItem value="CERTIFICATE">Certificate / Astashahada</SelectItem>
                      <SelectItem value="MASTERS">Masters / Shahada ya Uzamili (Associate)</SelectItem>
                      <SelectItem value="PHD">PhD / Shahada ya Uzamivu (Associate)</SelectItem>
                      <SelectItem value="OTHER">Other / Mengineyo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Course Selection & Highlighting (From official UDSM prospectus document) */}
              <div className="space-y-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <Label className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                      <Search className="h-4 w-4 text-primary" /> Tafuta na Chagua Kozi Yako (UDSM Programmes) <span className="text-rose-500">*</span>
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Andika jina la kozi yako hapa chini; mfumo utakuangazia kozi zote 93 rasmi za UDSM ili uzichague kwa mbofyo mmoja.
                    </p>
                  </div>

                  {program && program !== "OTHER" && (
                    <Badge variant="default" className="gap-1.5 self-start sm:self-auto bg-emerald-600 hover:bg-emerald-700 py-1 px-2.5">
                      <Check className="h-3 w-3" /> Umechagua: {program}
                    </Badge>
                  )}
                </div>

                {/* Search & College Filter bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <div className="sm:col-span-2 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Andika jina la kozi (Mfano: Computer, Engineering, Law, Education, Accounting...)"
                      value={courseSearch}
                      onChange={(e) => setCourseSearch(e.target.value)}
                      className="pl-9 h-10 text-xs bg-background"
                    />
                  </div>
                  <Select value={collegeFilter} onValueChange={setCollegeFilter}>
                    <SelectTrigger className="h-10 text-xs bg-background">
                      <SelectValue placeholder="Chuja kwa Ndaki" />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      <SelectItem value="ALL">Ndaki Zote (All 15 Colleges)</SelectItem>
                      {UDSM_COLLEGES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code} — {c.name.split("(")[0].trim()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Highlighted Results Stream */}
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 border rounded-lg p-2 bg-background/80">
                  {filteredProgrammes.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      <p>Hakuna kozi iliyopatikana kwa utafutaji &quot;{courseSearch}&quot;.</p>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={() => {
                          setProgram("OTHER");
                          setCustomProgram(courseSearch);
                        }}
                        className="text-xs mt-1 text-primary"
                      >
                        Tumia kama kozi nyingine (Custom Programme)
                      </Button>
                    </div>
                  ) : (
                    filteredProgrammes.map((p) => {
                      const isSelected = program === p.programme;
                      return (
                        <div
                          key={p.programme}
                          onClick={() => handleSelectCourse(p.programme, p.collegeCode)}
                          className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 text-xs ${
                            isSelected
                              ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary"
                              : "border-border/60 hover:border-primary/40 hover:bg-muted/40"
                          }`}
                        >
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <p className="font-semibold text-foreground truncate">
                              <HighlightMatch text={p.programme} query={courseSearch} />
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {p.collegeName} · <span className="font-medium text-primary">{p.years} Miaka ya Masomo</span>
                            </p>
                          </div>

                          <div className="shrink-0 flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px] bg-background">
                              {p.collegeCode}
                            </Badge>
                            {isSelected ? (
                              <span className="h-6 w-6 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                                <Check className="h-3.5 w-3.5" />
                              </span>
                            ) : (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-[11px] px-2 hover:bg-primary hover:text-white"
                              >
                                Chagua
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Option for custom course */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-muted-foreground">Kozi yako haipo kwenye orodha hii?</span>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="text-xs text-primary p-0 h-auto"
                    onClick={() => {
                      setProgram(program === "OTHER" ? "BSc in Computer Science" : "OTHER");
                    }}
                  >
                    {program === "OTHER" ? "Rudi kwenye orodha ya UDSM" : "Weka Kozi Nyingine"}
                  </Button>
                </div>

                {program === "OTHER" && (
                  <div className="space-y-1.5 pt-2 border-t">
                    <Label className="text-xs font-semibold">Andika Kozi Yako Hapa</Label>
                    <Input
                      placeholder="Mfano: BSc in Specialized Technology"
                      value={customProgram}
                      onChange={(e) => setCustomProgram(e.target.value)}
                      required
                      className="bg-background"
                    />
                  </div>
                )}
              </div>

              {/* Accommodation / Makazi */}
              <div className="pt-2 space-y-3 border-t">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-primary" /> Makazi / Accommodation
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Sehemu unayoishi (Hostel / Campus)</Label>
                    <Select value={accommodationType} onValueChange={setAccommodationType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MABIBO_HOSTEL">Mabibo Hostel</SelectItem>
                        <SelectItem value="MAGUFULI_HOSTEL">Magufuli Hostel</SelectItem>
                        <SelectItem value="COICT_HOSTEL">CoICT Hostel (Kijitonyama)</SelectItem>
                        <SelectItem value="MAIN_CAMPUS">Main Campus (Ndani ya Chuo)</SelectItem>
                        <SelectItem value="OFF_CAMPUS">Off Campus / Nje ya Chuo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {accommodationType === "OFF_CAMPUS" ? (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Mahali unapoishi (Off-campus Location)</Label>
                      <Input
                        placeholder="Mfano: Mwenge, Sinza, Ubungo, Makumbusho..."
                        value={offCampusLocation}
                        onChange={(e) => setOffCampusLocation(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Block / Bweni</Label>
                        <Input
                          placeholder="Mfano: Block A"
                          value={block}
                          onChange={(e) => setBlock(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Chumba (Room No)</Label>
                        <Input
                          placeholder="Mfano: 204"
                          value={roomNo}
                          onChange={(e) => setRoomNo(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Declaration / Tamko */}
          <Card className="shadow-md border-primary/30">
            <CardHeader className="border-b bg-primary/5 py-4">
              <CardTitle className="text-base font-serif flex items-center gap-2 text-primary">
                <HeartHandshake className="h-5 w-5" /> 4. DECLARATION / TAMKO LA UANACHAMA
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="p-4 rounded-lg bg-muted/40 border border-border/80 text-sm leading-relaxed font-serif italic text-foreground">
                “I declare that I will be a faithful and active member of CASFETA UDSM and I will be faithful to my Lord Jesus Christ all the time of studies at the University of Dar es Salaam.”
              </div>

              <div className="flex items-start space-x-3 pt-2">
                <Checkbox
                  id="declaration-checkbox"
                  checked={declarationSigned}
                  onCheckedChange={(checked) => setDeclarationSigned(checked === true)}
                  className="mt-0.5"
                />
                <label
                  htmlFor="declaration-checkbox"
                  className="text-xs sm:text-sm font-medium leading-normal cursor-pointer select-none text-foreground"
                >
                  Nathibitisha na kukubali tamko hili rasmi kama mwanachama mwaminifu wa CASFETA UDSM.
                </label>
              </div>
            </CardContent>

            <CardFooter className="bg-muted/20 border-t p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Taarifa zako zitalindwa kwa usalama na uongozi wa tawi la CASFETA UDSM.
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={submitting || !declarationSigned}
                className="w-full sm:w-auto px-8 gap-2 shadow-lg text-base"
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                    Inahifadhi Usajili...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" /> Kamilisha Usajili na Fungua Mfumo
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </div>
  );
}
