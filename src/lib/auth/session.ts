import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { ROLES } from "@/lib/rbac/permissions";

const SESSION_COOKIE = "cud_session";
const SESSION_SECRET = process.env.SESSION_SECRET || "cud-management-system-dev-secret-key-change-in-production";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  userId: string;
  memberId: string | null;
  role: string;
  email: string;
  username: string;
  name: string;
}

/**
 * Sign a session JWT and write it to cookies.
 * Server-side only — must be called from a Server Action or Route Handler.
 */
export async function createSession(user: {
  id: string;
  email: string;
  username: string;
  role: string;
  memberId: string | null;
  name: string;
}): Promise<void> {
  const payload: SessionPayload = {
    userId: user.id,
    memberId: user.memberId,
    role: user.role,
    email: user.email,
    username: user.username,
    name: user.name,
  };
  const token = jwt.sign(payload, SESSION_SECRET, { expiresIn: `${SESSION_MAX_AGE}s` });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

/**
 * Destroy the current session by clearing the cookie.
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Read the session JWT from the request cookies and verify it.
 * Server-side only.
 */
export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const payload = jwt.verify(token, SESSION_SECRET) as SessionPayload;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Variant of getSession that also verifies the user still exists and is active in DB.
 * Use this for protected route handlers and server actions.
 */
export async function getCurrentUser(): Promise<{
  user: SessionPayload;
  member: Awaited<ReturnType<typeof db.member.findUnique>>;
} | null> {
  const session = await getSession();
  if (!session) return null;

  const dbUser = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, isActive: true, role: true },
  });
  if (!dbUser || !dbUser.isActive) {
    await destroySession();
    return null;
  }

  // Refresh role from DB in case it changed since session was issued
  if (dbUser.role !== session.role) {
    session.role = dbUser.role;
  }

  const member = session.memberId
    ? await db.member.findUnique({ where: { id: session.memberId } })
    : null;

  return { user: session, member };
}

/**
 * Require a session; throws if unauthenticated.
 */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  return session;
}

/**
 * Require a specific role or higher.
 */
export async function requireRole(...roles: string[]): Promise<SessionPayload> {
  const session = await requireSession();
  if (!roles.includes(session.role)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export const ROLE_VALUES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MEMBER];
