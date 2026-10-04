/**
 * Role hierarchy & permission map for CUD Management System.
 * Roles: SUPER_ADMIN | ADMIN | MEMBER
 */

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/**
 * Granular permissions used across modules.
 * Each module action maps to a set of allowed roles.
 */
export const PERMISSIONS = {
  // Members
  MEMBER_VIEW: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MEMBER],
  MEMBER_CREATE: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  MEMBER_UPDATE: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  MEMBER_DELETE: [ROLES.SUPER_ADMIN],
  MEMBER_APPROVE: [ROLES.SUPER_ADMIN, ROLES.ADMIN],

  // Skills
  SKILL_VIEW: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MEMBER],
  SKILL_REQUEST: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MEMBER],
  SKILL_MANAGE_CATALOG: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  SKILL_APPROVE: [ROLES.SUPER_ADMIN, ROLES.ADMIN],

  // Ministries
  MINISTRY_VIEW: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MEMBER],
  MINISTRY_MANAGE: [ROLES.SUPER_ADMIN, ROLES.ADMIN],

  // Attendance
  ATTENDANCE_VIEW: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MEMBER],
  ATTENDANCE_RECORD: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  ATTENDANCE_OWN_VIEW: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MEMBER],

  // Documents
  DOCUMENT_VIEW: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MEMBER],
  DOCUMENT_UPLOAD: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  DOCUMENT_DELETE: [ROLES.SUPER_ADMIN],

  // Announcements
  ANNOUNCEMENT_VIEW: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MEMBER],
  ANNOUNCEMENT_CREATE: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  ANNOUNCEMENT_DELETE: [ROLES.SUPER_ADMIN],
  SMS_BROADCAST: [ROLES.SUPER_ADMIN, ROLES.ADMIN],

  // Events
  EVENT_VIEW: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MEMBER],
  EVENT_MANAGE: [ROLES.SUPER_ADMIN, ROLES.ADMIN],

  // Reports
  REPORT_VIEW: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  REPORT_EXPORT: [ROLES.SUPER_ADMIN, ROLES.ADMIN],

  // Users & System
  USER_MANAGE: [ROLES.SUPER_ADMIN],
  SETTING_MANAGE: [ROLES.SUPER_ADMIN],
  AUDIT_VIEW: [ROLES.SUPER_ADMIN],
} as const;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Returns true if the given role has the requested permission.
 */
export function can(role: string | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  const allowed = PERMISSIONS[permission] as readonly string[];
  return allowed.includes(role);
}

/**
 * Throws an AuthorizationError if the role lacks the permission.
 */
export class AuthorizationError extends Error {
  constructor(message = "You are not authorized to perform this action.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export function authorize(role: string | undefined | null, permission: Permission): void {
  if (!can(role, permission)) {
    throw new AuthorizationError();
  }
}

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MEMBER: "Member",
};

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  SUPER_ADMIN: "Chairman, Vice Chairman, Secretary, Treasurer, Pastor, Teacher, ICT Administrator — full access.",
  ADMIN: "Ministry Leaders — manage their ministry, attendance, members.",
  MEMBER: "Registered fellowship member — profile, skills, ministries, documents, announcements.",
};
