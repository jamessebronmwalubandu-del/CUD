import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Terms of Service | CASFETA CUD",
  description: "Terms of Service for the CASFETA CUD Chapter Management System.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-muted/20 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-card rounded-2xl shadow-sm border border-border p-6 sm:p-10 space-y-8">
        <div className="flex items-center justify-between border-b pb-5">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="CASFETA CUD"
              className="h-10 w-10 rounded-xl object-contain bg-slate-950 p-1"
            />
            <div>
              <h1 className="text-xl font-serif font-bold">CASFETA CUD</h1>
              <p className="text-xs text-muted-foreground">Terms of Service / Masharti ya Huduma</p>
            </div>
          </div>
          <Link
            href="/"
            className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to App
          </Link>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-foreground/90">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              By accessing, registering, or using the CASFETA CUD Management System, you agree to comply with and be bound by these Terms of Service and the fellowship&apos;s constitution and conduct guidelines.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">2. Membership Eligibility & Account Use</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              This system is provided for students, staff, and associates affiliated with CASFETA University of Dar es Salaam (CUD Chapter). You agree to provide accurate, up-to-date information during onboarding and maintain the security of your login credentials.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">3. Code of Conduct</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Users agree not to misuse the platform, distribute unsolicited communications, upload inappropriate or copyrighted materials, or attempt unauthorized access to other members&apos; personal data or administrative controls.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">4. System Administration & Moderation</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Fellowship leadership and system administrators reserve the right to review account registrations, verify student records, assign administrative roles, and deactivate accounts that violate community rules.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">5. Changes to Terms</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              CASFETA CUD may update these terms periodically to reflect fellowship needs or technical updates. Continued use of the platform constitutes acceptance of updated terms.
            </p>
          </section>
        </div>

        <div className="pt-6 border-t text-xs text-muted-foreground flex justify-between items-center">
          <span>Last updated: October 2026</span>
          <span>© {new Date().getFullYear()} CASFETA CUD Chapter</span>
        </div>
      </div>
    </div>
  );
}
