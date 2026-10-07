import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth/session";
import { auditLog } from "@/lib/services/audit";

export const runtime = "nodejs";

/**
 * GET /api/auth/google/callback
 *
 * Google redirects here after the user grants permission.
 * Flow:
 *  1. Exchange the `code` for tokens
 *  2. Fetch the user's Google profile (email, name, picture)
 *  3. Find the matching User in the DB by email
 *  4. Create a session — or return an error if no account exists
 */
export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin || "http://localhost:3000";
  const { searchParams } = new URL(req.url);

  const error = searchParams.get("error");
  if (error) {
    console.warn("[Google OAuth] Received error from Google:", error);
    return NextResponse.redirect(`${appUrl}?error=google_denied`);
  }

  const code = searchParams.get("code");
  if (!code) {
    console.warn("[Google OAuth] No code parameter received in callback");
    return NextResponse.redirect(`${appUrl}?error=google_no_code`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("[Google OAuth] Configuration error: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing from environment variables.");
    return NextResponse.redirect(`${appUrl}?error=google_server_error`);
  }

  const redirectUri = `${appUrl}/api/auth/google/callback`;

  try {
    // ── Step 1: Exchange code for tokens ──────────────────────────────
    console.log(`[Google OAuth] Exchanging code with redirect_uri: ${redirectUri}`);
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error("[Google OAuth] Token exchange failed. Status:", tokenRes.status, "Response:", errorText);
      return NextResponse.redirect(`${appUrl}?error=google_token_failed`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      console.error("[Google OAuth] No access_token returned by Google:", tokenData);
      return NextResponse.redirect(`${appUrl}?error=google_token_failed`);
    }

    // ── Step 2: Fetch Google profile ──────────────────────────────────
    const profileRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!profileRes.ok) {
      const profileError = await profileRes.text();
      console.error("[Google OAuth] Failed to fetch Google profile. Status:", profileRes.status, "Response:", profileError);
      return NextResponse.redirect(`${appUrl}?error=google_profile_failed`);
    }

    const profile: { email?: string; name?: string; picture?: string } =
      await profileRes.json();

    if (!profile.email) {
      console.error("[Google OAuth] Google profile did not contain an email:", profile);
      return NextResponse.redirect(`${appUrl}?error=google_profile_failed`);
    }

    // ── Step 3: Find existing user by email ───────────────────────────
    const user = await db.user.findUnique({
      where: { email: profile.email.toLowerCase() },
      include: { member: true },
    });

    if (!user || !user.isActive) {
      console.warn(`[Google OAuth] No active user found for email: ${profile.email}`);
      return NextResponse.redirect(
        `${appUrl}?error=google_no_account&email=${encodeURIComponent(profile.email)}`
      );
    }

    // ── Step 4: Create session & update last login ────────────────────
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = generateSessionToken({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      memberId: user.memberId,
      name: user.member?.fullName ?? user.username,
    });

    await auditLog({
      actorId: user.memberId,
      action: "LOGIN",
      module: "AUTH",
      description: `${user.username} logged in with Google.`,
      metadata: { username: user.username, email: user.email, role: user.role, authMethod: "google" },
    });

    const response = NextResponse.redirect(`${appUrl}`);
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    console.error("[Google OAuth] Unexpected error in callback handler:", err);
    return NextResponse.redirect(`${appUrl}?error=google_server_error`);
  }
}
