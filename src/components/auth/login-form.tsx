"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  Users,
  Heart,
  BookOpen,
  User,
  Phone,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";
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
  google_token_failed: "Failed to exchange Google token. Please verify configuration.",
  google_profile_failed: "Could not fetch your Google profile.",
  google_no_account: "Account could not be created or verified.",
  google_server_error: "An unexpected error occurred with Google sign-in.",
};

export function LoginForm() {
  const { signIn, signUp } = useAuth();
  const { t } = useI18n();

  // Mode: "signin" | "signup"
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");

  // Sign In state
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sign Up state
  const [signUpFullName, setSignUpFullName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpUsername, setSignUpUsername] = useState("");
  const [signUpPhone, setSignUpPhone] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState("");
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [signUpError, setSignUpError] = useState<string | null>(null);

  // Forgot password dialog state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  // Pick up OAuth error params on redirect-back from Google
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error");
    if (oauthError) {
      setError(GOOGLE_ERROR_MESSAGES[oauthError] ?? "Google sign-in failed.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Handle Sign In submission
  async function handleSignInSubmit(e: React.FormEvent) {
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

  // Handle Sign Up submission
  async function handleSignUpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSignUpError(null);

    if (!signUpFullName.trim()) {
      setSignUpError(t("auth.fullName") + " is required.");
      return;
    }
    if (!signUpEmail.trim()) {
      setSignUpError(t("auth.email") + " is required.");
      return;
    }
    if (!signUpUsername.trim()) {
      setSignUpError(t("auth.username") + " is required.");
      return;
    }
    if (!signUpPassword) {
      setSignUpError(t("auth.password") + " is required.");
      return;
    }
    if (signUpPassword.length < 6) {
      setSignUpError(t("auth.passwordTooShort"));
      return;
    }
    if (signUpPassword !== signUpConfirmPassword) {
      setSignUpError(t("auth.passwordsDoNotMatch"));
      return;
    }

    setSignUpLoading(true);
    try {
      const user = await signUp({
        fullName: signUpFullName.trim(),
        email: signUpEmail.trim().toLowerCase(),
        username: signUpUsername.trim().toLowerCase(),
        password: signUpPassword,
        phoneNumber: signUpPhone.trim() || undefined,
      });
      toast.success(t("auth.accountCreated") || `Welcome, ${user.name}!`);
    } catch (err) {
      setSignUpError(err instanceof Error ? err.message : "Failed to create account.");
    } finally {
      setSignUpLoading(false);
    }
  }

  // Handle Google Sign-in redirection
  function handleGoogleSignIn() {
    setGoogleLoading(true);
    window.location.href = "/api/auth/google";
  }

  // Handle Forgot Password submission
  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotIdentifier.trim()) {
      toast.error(t("auth.emailUsernameRequired"));
      return;
    }
    setForgotLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: forgotIdentifier.trim() }),
      });
      if (!res.ok) throw new Error("Could not process request.");
      setForgotSubmitted(true);
    } catch {
      setForgotSubmitted(true);
    } finally {
      setForgotLoading(false);
    }
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
      <div className="flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-md space-y-6 py-4">
          <div className="text-center space-y-2">
            <div className="lg:hidden inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {activeTab === "signin" ? t("auth.signInToAccount") : t("auth.createAccount")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {activeTab === "signin" ? t("auth.welcomeBack") : t("auth.createAccountDesc")}
            </p>
          </div>

          {/* Tab switcher: Sign In vs Sign Up */}
          <Tabs
            value={activeTab}
            onValueChange={(val) => {
              setActiveTab(val as "signin" | "signup");
              setError(null);
              setSignUpError(null);
            }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 h-11 p-1 bg-muted/70">
              <TabsTrigger value="signin" className="text-xs sm:text-sm font-medium">
                {t("auth.signIn")}
              </TabsTrigger>
              <TabsTrigger value="signup" className="text-xs sm:text-sm font-medium">
                {t("auth.signUp")}
              </TabsTrigger>
            </TabsList>

            {/* Google Sign-In button (available on both tabs) */}
            <div className="pt-4">
              <Button
                id="google-signin-btn"
                type="button"
                variant="outline"
                className="w-full flex items-center justify-center gap-3 h-11 text-sm font-medium shadow-sm hover:bg-muted/60"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading || signUpLoading}
              >
                <GoogleIcon className="h-5 w-5 shrink-0" />
                {googleLoading ? "Redirecting to Google…" : "Continue with Google"}
              </Button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 py-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">
                {activeTab === "signin" ? "or sign in with password" : "or register with details"}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* ─── TAB 1: SIGN IN ────────────────────────────────────────────── */}
            <TabsContent value="signin" className="mt-0">
              <Card className="border-border/60 shadow-sm">
                <form onSubmit={handleSignInSubmit}>
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
                        <button
                          type="button"
                          onClick={() => {
                            setForgotSubmitted(false);
                            setForgotIdentifier(identifier);
                            setForgotOpen(true);
                          }}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          {t("auth.forgotPassword")}
                        </button>
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
                  <CardFooter className="flex flex-col gap-3">
                    <Button
                      id="password-signin-btn"
                      type="submit"
                      className="w-full h-10 font-medium"
                      disabled={loading || googleLoading}
                    >
                      {loading ? t("auth.signingIn") : t("auth.signIn")}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      {t("auth.dontHaveAccount")}{" "}
                      <button
                        type="button"
                        onClick={() => setActiveTab("signup")}
                        className="text-primary hover:underline font-medium"
                      >
                        {t("auth.signUp")}
                      </button>
                    </p>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>

            {/* ─── TAB 2: SIGN UP ────────────────────────────────────────────── */}
            <TabsContent value="signup" className="mt-0">
              <Card className="border-border/60 shadow-sm">
                <form onSubmit={handleSignUpSubmit}>
                  <CardHeader className="space-y-1 pb-4">
                    <CardTitle className="text-base">{t("auth.createAccount")}</CardTitle>
                    <CardDescription>{t("auth.createAccountDesc")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3.5">
                    {signUpError && (
                      <Alert variant="destructive">
                        <AlertDescription>{signUpError}</AlertDescription>
                      </Alert>
                    )}

                    {/* Full Name */}
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-fullname">{t("auth.fullName")}</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-fullname"
                          type="text"
                          placeholder="e.g. Grace Mwambene"
                          className="pl-10 h-9"
                          value={signUpFullName}
                          onChange={(e) => setSignUpFullName(e.target.value)}
                          disabled={signUpLoading || googleLoading}
                          required
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-email">{t("auth.email")}</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="e.g. member@gmail.com"
                          className="pl-10 h-9"
                          value={signUpEmail}
                          onChange={(e) => setSignUpEmail(e.target.value)}
                          disabled={signUpLoading || googleLoading}
                          required
                        />
                      </div>
                    </div>

                    {/* Username & Phone Number (side-by-side on sm) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="signup-username">{t("auth.username")}</Label>
                        <Input
                          id="signup-username"
                          type="text"
                          placeholder="e.g. gracem"
                          className="h-9"
                          value={signUpUsername}
                          onChange={(e) => setSignUpUsername(e.target.value)}
                          disabled={signUpLoading || googleLoading}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="signup-phone">{t("auth.phoneNumber")}</Label>
                        <div className="relative">
                          <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            id="signup-phone"
                            type="tel"
                            placeholder="+255 7..."
                            className="pl-8 h-9 text-xs"
                            value={signUpPhone}
                            onChange={(e) => setSignUpPhone(e.target.value)}
                            disabled={signUpLoading || googleLoading}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-password">{t("auth.password")}</Label>
                      <div className="relative">
                        <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-password"
                          type={showSignUpPassword ? "text" : "password"}
                          placeholder="Min 6 characters"
                          className="pl-10 pr-10 h-9"
                          value={signUpPassword}
                          onChange={(e) => setSignUpPassword(e.target.value)}
                          autoComplete="new-password"
                          disabled={signUpLoading || googleLoading}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignUpPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          tabIndex={-1}
                          aria-label={showSignUpPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                        >
                          {showSignUpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-confirm-password">{t("auth.confirmPassword")}</Label>
                      <div className="relative">
                        <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-confirm-password"
                          type={showSignUpPassword ? "text" : "password"}
                          placeholder="Re-enter password"
                          className="pl-10 h-9"
                          value={signUpConfirmPassword}
                          onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                          autoComplete="new-password"
                          disabled={signUpLoading || googleLoading}
                          required
                        />
                      </div>
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Your default role is <span className="font-semibold text-foreground">Member</span>. Fellowship Super Admin can grant leader/admin permissions if assigned.
                    </p>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-3">
                    <Button
                      id="signup-submit-btn"
                      type="submit"
                      className="w-full h-10 font-medium"
                      disabled={signUpLoading || googleLoading}
                    >
                      {signUpLoading ? t("auth.signingUp") : t("auth.createAccount")}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      {t("auth.alreadyHaveAccount")}{" "}
                      <button
                        type="button"
                        onClick={() => setActiveTab("signin")}
                        className="text-primary hover:underline font-medium"
                      >
                        {t("auth.signIn")}
                      </button>
                    </p>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ─── FORGOT PASSWORD DIALOG ────────────────────────────────────────── */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              {t("auth.forgotPasswordTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("auth.forgotPasswordDesc")}
            </DialogDescription>
          </DialogHeader>

          {forgotSubmitted ? (
            <div className="space-y-4 py-3">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                <p className="text-xs leading-relaxed">
                  {t("auth.forgotPasswordSuccess")}
                </p>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setForgotOpen(false)}
                >
                  {t("auth.backToSignIn")}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div className="space-y-2 py-2">
                <Label htmlFor="forgot-identifier">{t("auth.emailOrUsername")}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="forgot-identifier"
                    type="text"
                    placeholder="Enter your email or username"
                    className="pl-10"
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    required
                    disabled={forgotLoading}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  The Super Admin can also immediately reset or manage your credentials directly from System Settings.
                </p>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setForgotOpen(false)}
                  disabled={forgotLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={forgotLoading}>
                  {forgotLoading ? "Submitting…" : t("auth.forgotPasswordSubmit")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
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
