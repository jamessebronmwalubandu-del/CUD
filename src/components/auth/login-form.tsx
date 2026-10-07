"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles, Users, Heart, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

/** Google "G" SVG icon */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_denied: "Google sign-in was cancelled.",
  google_no_code: "Google did not return an authorisation code.",
  google_token_failed: "Failed to exchange Google token. Please try again.",
  google_profile_failed: "Could not fetch your Google profile.",
  google_no_account:
    "No account is linked to that Google email. Please sign in with your password first.",
  google_server_error: "An unexpected error occurred with Google sign-in.",
};

export function LoginForm() {
  const { signIn } = useAuth();
  const { t, locale } = useI18n();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pick up OAuth error params on redirect-back from Google
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error");
    if (oauthError) {
      setError(GOOGLE_ERROR_MESSAGES[oauthError] ?? "Google sign-in failed.");
      // Clean the URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!identifier || !password) {
      setError(t("auth.emailUsernameRequired"));
      return;
    }
    setLoading(true);
    try {
      const user = await signIn(identifier, password);
      toast.success(t("auth.signedIn", { name: user.name }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.loginFailed"));
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleSignIn() {
    setGoogleLoading(true);
    window.location.href = "/api/auth/google";
  }

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 relative">
      {/* Language switcher (top-right floating) */}
      <div className="absolute top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>

      {/* Left — Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden bg-gradient-to-br from-primary via-primary to-accent-foreground text-primary-foreground">
        <div className="absolute inset-0 bg-grid-pattern opacity-20" />
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary-foreground/15 backdrop-blur flex items-center justify-center">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-serif tracking-wide">CASFETA</p>
              <p className="text-xs opacity-80">{t("common.orgName")}</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-6 max-w-md">
          <h1 className="font-serif text-4xl xl:text-5xl leading-tight">
            {t("auth.brand.tagline")}
          </h1>
          <p className="text-base opacity-90 leading-relaxed">
            {t("auth.brand.description")}
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <FeaturePill icon={Users} label={t("auth.brand.feature.directory")} />
            <FeaturePill icon={Heart} label={t("auth.brand.feature.ministries")} />
            <FeaturePill icon={BookOpen} label={t("auth.brand.feature.skills")} />
            <FeaturePill icon={Sparkles} label={t("auth.brand.feature.reports")} />
          </div>
        </div>

        <div className="relative z-10 text-xs opacity-70">
          {t("auth.brand.copyright", { year: new Date().getFullYear() })}
        </div>
      </div>

      {/* Right — Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="lg:hidden inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">{t("auth.signInToAccount")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("auth.welcomeBack")}
            </p>
          </div>

          {/* Google Sign-In button */}
          <Button
            id="google-signin-btn"
            type="button"
            variant="outline"
            className="w-full flex items-center gap-3 h-11 text-sm font-medium"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
          >
            <GoogleIcon className="h-5 w-5 shrink-0" />
            {googleLoading ? "Redirecting to Google…" : "Continue with Google"}
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or sign in with password</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Card className="border-border/60 shadow-sm">
            <form onSubmit={handleSubmit}>
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-base">{t("auth.signIn")}</CardTitle>
                <CardDescription>{t("auth.welcomeBack")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="identifier">{t("auth.emailOrUsername")}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="identifier"
                      type="text"
                      placeholder={t("auth.placeholder.identifier")}
                      className="pl-10"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      autoComplete="username"
                      disabled={loading || googleLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">{t("auth.password")}</Label>
                    <span className="text-xs text-muted-foreground">{t("auth.passwordHint")}</span>
                  </div>
                  <div className="relative">
                    <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      disabled={loading || googleLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                      aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button
                  id="password-signin-btn"
                  type="submit"
                  className="w-full"
                  disabled={loading || googleLoading}
                >
                  {loading ? t("auth.signingIn") : t("auth.signIn")}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

function FeaturePill({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-primary-foreground/10 backdrop-blur px-3 py-2">
      <Icon className="h-4 w-4" />
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}
