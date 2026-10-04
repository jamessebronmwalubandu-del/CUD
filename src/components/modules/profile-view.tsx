"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { label, initials } from "@/lib/utils/client";
import {
  UserCircle,
  Mail,
  Phone,
  MapPin,
  Camera,
  Trash2,
  Save,
  CheckCircle2,
  ShieldCheck,
  Building2,
  GraduationCap,
  Sparkles,
  Award,
  FileText,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

export function ProfileView() {
  const { user, member, refresh } = useAuth();
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [biography, setBiography] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [hostel, setHostel] = useState("");
  const [homeRegion, setHomeRegion] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");

  // Populate form from user and member session
  useEffect(() => {
    if (user) {
      setUsername(user.username || "");
      setEmail(user.email || "");
    }
    if (member) {
      setFullName(member.fullName || "");
      setBiography(member.biography || "");
      setProfilePhoto(member.profilePhoto || "");
      setPhoneNumber(member.phoneNumber || "");
      setHostel(member.hostel || "");
      setHomeRegion(member.homeRegion || "");
      setEmergencyContact(member.emergencyContact || "");
    }
  }, [user, member]);

  // Handle local image upload -> Base64 string
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("profile.photoTooLarge") || "Image must be smaller than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setProfilePhoto(reader.result);
        toast.success(t("profile.photoSelected") || "Profile photo updated in draft");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error(t("profile.nameRequired") || "Full name is required");
      return;
    }
    if (!username.trim()) {
      toast.error(t("profile.usernameRequired") || "Username is required");
      return;
    }
    if (!email.trim()) {
      toast.error(t("profile.emailRequired") || "Email is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          username,
          email,
          biography,
          profilePhoto,
          phoneNumber,
          hostel,
          homeRegion,
          emergencyContact,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update profile");
      }

      await refresh();
      toast.success(t("profile.updateSuccess") || "Profile updated successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const displayName = fullName || user.name || user.username;
  const roleLabel =
    user.role === "SUPER_ADMIN"
      ? "Super Admin"
      : user.role === "ADMIN"
      ? "Admin"
      : "Member";

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Profile Header Hero Card */}
      <Card className="border-0 bg-gradient-to-br from-card via-card to-primary/5 shadow-md overflow-hidden relative">
        <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20 border-b border-border/40" />
        <CardContent className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-16 sm:-mt-14 mb-4">
            {/* Avatar with Upload trigger */}
            <div className="relative group">
              <Avatar className="h-28 w-28 border-4 border-background shadow-xl ring-2 ring-primary/20">
                {profilePhoto ? (
                  <AvatarImage src={profilePhoto} alt={displayName} className="object-cover" />
                ) : null}
                <AvatarFallback className="bg-primary/15 text-primary text-2xl font-bold">
                  {initials(displayName)}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-1 right-1 h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-transform active:scale-95"
                title={t("profile.changePhoto") || "Change Profile Photo"}
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>

            {/* Header info */}
            <div className="flex-1 text-center sm:text-left space-y-1.5 min-w-0">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h2 className="text-2xl font-serif font-bold tracking-tight">{displayName}</h2>
                <Badge variant="secondary" className="bg-primary/15 text-primary font-medium">
                  <ShieldCheck className="h-3.5 w-3.5 mr-1" /> {roleLabel}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-2">
                <span>@{username}</span>
                <span>•</span>
                <span>{email}</span>
                {member?.regNumber && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{member.regNumber}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Public Introduction Preview */}
          {biography && (
            <div className="mt-4 p-4 rounded-xl bg-accent/40 border border-border/50 text-sm italic text-muted-foreground flex items-start gap-3">
              <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="line-clamp-3">"{biography}"</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profile Form */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details (Left 2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section: Basic Identity */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-primary" />
                {t("profile.personalInfo") || "Personal Information"}
              </CardTitle>
              <CardDescription>
                {t("profile.personalInfoDesc") || "Update your name, username, email, and contact details."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("common.fullName") || "Full Name"} *
                  </label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Grace Wanjiru"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("auth.username") || "Username"} *
                  </label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. gracew"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("common.email") || "Email Address"} *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@cud.ac.ke"
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("common.phone") || "Phone Number"}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+254 700 000000"
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("members.hostel") || "Hostel / Residence"}
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={hostel}
                      onChange={(e) => setHostel(e.target.value)}
                      placeholder="e.g. Hallelujah Hostel"
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("members.homeRegion") || "Home Region / Town"}
                  </label>
                  <Input
                    value={homeRegion}
                    onChange={(e) => setHomeRegion(e.target.value)}
                    placeholder="e.g. Nairobi, Kenya"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("directory.emergency") || "Emergency Contact"}
                </label>
                <Input
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="e.g. Parent / Guardian Phone Number"
                />
              </div>
            </CardContent>
          </Card>

          {/* Section: Self Introduction / Public Note */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {t("profile.biographyTitle") || "Self Introduction & Public Note"}
              </CardTitle>
              <CardDescription>
                {t("profile.biographyDesc") || "Share a brief biography or public note visible to fellowship members in the directory."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                rows={4}
                value={biography}
                onChange={(e) => setBiography(e.target.value)}
                placeholder={
                  t("profile.biographyPlaceholder") ||
                  "e.g. Passionate about prayer ministry, youth discipleship, and acoustic guitar. Feel free to connect!"
                }
                className="resize-none"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t("profile.publicNoteNotice") || "Visible on your public directory profile card."}</span>
                <span>{biography.length} / 500</span>
              </div>
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="submit"
              disabled={saving}
              className="gap-2 px-6 h-11 shadow-md text-base"
            >
              {saving ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                  {t("common.saving") || "Saving..."}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {t("common.save") || "Save Changes"}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right Sidebar: Profile Photo & Academic Overview */}
        <div className="space-y-6">
          {/* Profile Photo Uploader Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                {t("profile.photoTitle") || "Profile Photo"}
              </CardTitle>
              <CardDescription>
                {t("profile.photoDesc") || "Upload or link an image for your profile."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <div className="flex flex-col items-center gap-3">
                <Avatar className="h-32 w-32 border-2 border-primary/20 shadow-md">
                  {profilePhoto ? (
                    <AvatarImage src={profilePhoto} alt={displayName} className="object-cover" />
                  ) : null}
                  <AvatarFallback className="bg-primary/15 text-primary text-3xl font-bold">
                    {initials(displayName)}
                  </AvatarFallback>
                </Avatar>

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                <div className="flex items-center gap-2 flex-wrap justify-center w-full">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-1.5"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    {t("profile.uploadPhoto") || "Upload Photo"}
                  </Button>

                  {profilePhoto && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setProfilePhoto("")}
                      className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t("common.remove") || "Remove"}
                    </Button>
                  )}
                </div>
              </div>

              <div className="pt-2 text-left space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("profile.photoUrlLabel") || "Or Enter Photo URL"}
                </label>
                <Input
                  type="url"
                  value={profilePhoto}
                  onChange={(e) => setProfilePhoto(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="text-xs"
                />
              </div>
            </CardContent>
          </Card>

          {/* Academic & Fellowship Context Card (Read-only) */}
          {member && (
            <Card className="bg-muted/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  {t("profile.academicTitle") || "Academic & Ministry Details"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="space-y-1">
                  <span className="text-muted-foreground">{t("members.faculty") || "Faculty"}</span>
                  <p className="font-medium text-foreground">{member.faculty || "—"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">{t("members.department") || "Department"}</span>
                  <p className="font-medium text-foreground">{member.department || "—"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">{t("members.course") || "Course"}</span>
                  <p className="font-medium text-foreground">{member.course || "—"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">{t("members.year") || "Year of Study"}</span>
                  <div>
                    <Badge variant="outline" className="text-[10px] mt-0.5">
                      {label(t, "year", member.yearOfStudy)}
                    </Badge>
                  </div>
                </div>

                {member.ministries && member.ministries.length > 0 && (
                  <div className="pt-2 border-t border-border/50 space-y-1.5">
                    <span className="text-muted-foreground font-medium flex items-center gap-1">
                      <Building2 className="h-3 w-3 text-primary" />
                      {t("directory.ministries") || "Ministries"}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {member.ministries.map((mm) => (
                        <Badge
                          key={mm.id}
                          variant="secondary"
                          className="text-[10px]"
                          style={{
                            backgroundColor: `${mm.ministry.color ?? "#0f766e"}15`,
                            color: mm.ministry.color ?? "#0f766e",
                          }}
                        >
                          {mm.ministry.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </form>
    </div>
  );
}
