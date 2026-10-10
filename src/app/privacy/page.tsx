import Link from "next/link";
import { ArrowLeft, ShieldCheck, Mail, MapPin } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | CASFETA CUD Chapter",
  description:
    "Comprehensive Privacy Policy for CASFETA CUD Chapter Management System, detailing Google user data collection, usage, retention, and security.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-muted/20 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-card rounded-2xl shadow-sm border border-border p-6 sm:p-12 space-y-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
          <div className="flex items-center gap-3.5">
            <img
              src="/logo.png"
              alt="CASFETA CUD"
              className="h-12 w-12 rounded-xl object-contain bg-slate-950 p-1 shadow-sm"
            />
            <div>
              <h1 className="text-2xl font-serif font-bold text-foreground">CASFETA CUD</h1>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                Official Privacy Policy / Sera Rasmi ya Faragha
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="text-xs text-primary hover:underline flex items-center gap-1.5 font-medium self-start sm:self-auto"
          >
            <ArrowLeft className="h-4 w-4" /> Rudi kwenye Mfumo (Back to App)
          </Link>
        </div>

        {/* Content */}
        <div className="space-y-8 text-sm text-foreground/90 leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
              1. Overview and Scope
            </h2>
            <p className="text-muted-foreground">
              This Privacy Policy applies to the <strong>CASFETA CUD Chapter Management System</strong> (accessible via our web portal), operated by the <strong>Christ’s Ambassadors Students Fellowship Tanzania (CASFETA) — University of Dar es Salaam (CUD Chapter)</strong>.
            </p>
            <p className="text-muted-foreground">
              We value and respect your privacy. This document outlines how our application collects, uses, handles, stores, and protects personal information, including data accessed through Google OAuth 2.0 authentication services.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              2. Information We Collect and How We Collect It
            </h2>
            <p className="text-muted-foreground">
              Our application collects information in the following ways:
            </p>
            <div className="space-y-3 pl-2">
              <div className="border-l-2 border-primary/40 pl-4 py-1">
                <h3 className="font-semibold text-foreground text-sm">A. Google User Data (OAuth 2.0)</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  When you authenticate using <strong>Continue with Google</strong>, we only request permission to access standard, non-sensitive identity scopes:
                </p>
                <ul className="list-disc pl-5 text-xs text-muted-foreground mt-2 space-y-1">
                  <li><strong><code>openid</code>:</strong> Unique Google User ID to identify your authentication session securely.</li>
                  <li><strong><code>https://www.googleapis.com/auth/userinfo.email</code> (email):</strong> Your Google email address, used as your primary username/contact for verification and fellowship notices.</li>
                  <li><strong><code>https://www.googleapis.com/auth/userinfo.profile</code> (profile):</strong> Your display name and profile picture URL, used to personalise your profile within the chapter directory.</li>
                </ul>
                <p className="text-xs font-medium text-primary mt-2">
                  We do NOT request access to Google Drive, Gmail, Google Contacts, Google Calendar, or any other sensitive or restricted Google APIs.
                </p>
              </div>

              <div className="border-l-2 border-primary/40 pl-4 py-1">
                <h3 className="font-semibold text-foreground text-sm">B. Student & Fellowship Information (User-Provided)</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Upon first login, members complete the official CASFETA CUD Onboarding Form to become active members:
                </p>
                <ul className="list-disc pl-5 text-xs text-muted-foreground mt-2 space-y-1">
                  <li><strong>Academic details:</strong> University Registration Number, College/School (e.g. CoICT, CoET), degree programme, and year of study.</li>
                  <li><strong>Contact details:</strong> Phone number and residence/hostel location.</li>
                  <li><strong>Fellowship details:</strong> Ministry engagement, spiritual gifts, and skills/talents catalogued for fellowship activities.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              3. Purpose and Use of Collected Data
            </h2>
            <p className="text-muted-foreground">
              CASFETA CUD uses the collected information strictly for legitimate organizational and student fellowship purposes:
            </p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1.5">
              <li>To create and authenticate user accounts and maintain active fellowship membership sessions.</li>
              <li>To distinguish between Full Members (undergraduate students) and Associate Members (postgraduate / alumni / external members).</li>
              <li>To enable members to connect with peers taking the same academic course (Course Mates).</li>
              <li>To coordinate departmental and ministry activities (e.g. Praise & Worship, Ushers, Media, Intercession).</li>
              <li>To deliver urgent fellowship broadcasts, announcements, and meeting reminders via in-app feeds or SMS.</li>
              <li>To generate aggregated administrative reports (e.g., total attendance, department membership distributions) for leadership reviews.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              4. Google API Services User Data Policy Compliance
            </h2>
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
              <p className="text-xs text-foreground font-semibold">
                Google Limited Use Disclosure:
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                CASFETA CUD’s use and transfer to any other app of information received from Google APIs will adhere to the{" "}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline font-medium"
                >
                  Google API Services User Data Policy
                </a>
                , including the Limited Use requirements.
              </p>
              <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                <li>We do NOT sell, rent, or trade Google user data to any third parties or data brokers.</li>
                <li>We do NOT use Google user data for advertising, targeted marketing, or profiling.</li>
                <li>We do NOT use Google user data to train generalized artificial intelligence or machine learning models.</li>
                <li>We only retain Google user data as long as necessary to fulfill the operational fellowship account functions described above.</li>
              </ul>
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              5. Data Sharing and Third-Party Disclosure
            </h2>
            <p className="text-muted-foreground">
              We do not share your personal information with external commercial entities. Data is only accessible to:
            </p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li><strong>Authorized Fellowship Administrators:</strong> Appointed CASFETA CUD executive leaders and ICT system administrators with role-based access rights.</li>
              <li><strong>Essential Infrastructure Providers:</strong> Hosting and database providers (such as Vercel and Neon PostgreSQL) operating under strict data confidentiality agreements solely for hosting the application.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              6. Data Storage, Retention, and Security
            </h2>
            <p className="text-muted-foreground">
              We implement comprehensive technical and organizational safeguards to protect your data:
            </p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li>All web communication is encrypted in transit using industry-standard TLS / HTTPS (256-bit encryption).</li>
              <li>User sessions are signed and verified with cryptographic tokens (JWT) stored in HTTP-only, Secure cookies.</li>
              <li>All database connections are enforced over SSL/TLS.</li>
              <li>Audit logs track administrative actions to prevent unauthorized tampering or data exposure.</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              7. User Rights, Data Deletion, and Revocation of Access
            </h2>
            <p className="text-muted-foreground">
              You retain full control over your personal information:
            </p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1.5">
              <li><strong>Revoke Google Access:</strong> You can revoke CASFETA CUD’s access to your Google account at any time by visiting{" "}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline font-medium"
                >
                  Google Account Security Settings &gt; Third-party apps with account access
                </a>.
              </li>
              <li><strong>Data Access and Correction:</strong> You can review and update your membership particulars directly from your in-app profile.</li>
              <li><strong>Account Deletion:</strong> To request complete deletion of your account and associated records, submit a request via the in-app <em>Feedback &amp; Inquiries</em> module or contact the ICT Team at the details below.</li>
            </ul>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              8. Contact Us
            </h2>
            <p className="text-muted-foreground">
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data handling practices, please contact:
            </p>
            <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-2 text-xs">
              <p className="font-semibold text-foreground">CASFETA CUD — ICT &amp; Administration Department</p>
              <p className="text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary shrink-0" /> University of Dar es Salaam, Mwalimu J.K. Nyerere Mlimani Campus, Dar es Salaam, Tanzania
              </p>
              <p className="text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary shrink-0" /> In-App Support: Feedback / Maoni Module
              </p>
              <p className="text-muted-foreground">Website: https://casfeta-cud.vercel.app</p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t text-xs text-muted-foreground flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>Effective Date: October 10, 2026</span>
          <span>© {new Date().getFullYear()} CASFETA CUD Chapter. All Rights Reserved.</span>
        </div>
      </div>
    </div>
  );
}
