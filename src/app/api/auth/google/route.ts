import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/auth/google
 * Redirects the browser to Google's OAuth consent screen.
 */
export function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin || "http://localhost:3000";

  if (!clientId) {
    console.error("[Google OAuth] GOOGLE_CLIENT_ID is not set in environment variables.");
    return new NextResponse("Google OAuth is not configured (GOOGLE_CLIENT_ID missing).", {
      status: 500,
    });
  }

  const redirectUri = `${appUrl}/api/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
