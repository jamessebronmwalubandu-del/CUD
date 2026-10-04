/**
 * Shared TypeScript types matching the API contract.
 */

export type Role = "SUPER_ADMIN" | "ADMIN" | "MEMBER";
export type Gender = "MALE" | "FEMALE";
export type YearOfStudy = "YEAR_1" | "YEAR_2" | "YEAR_3" | "YEAR_4" | "YEAR_5";
export type MemberStatus = "ACTIVE" | "INACTIVE" | "GRADUATED";
export type SkillStatus = "PENDING" | "APPROVED" | "REJECTED";
export type Proficiency = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
export type MinistryRole = "LEADER" | "ASSISTANT" | "MEMBER";
export type AttendanceType =
  | "SUNDAY_FELLOWSHIP"
  | "BIBLE_STUDY"
  | "PRAYER_MEETING"
  | "CONFERENCE"
  | "EVANGELISM";
export type DocumentCategory =
  | "CONSTITUTION"
  | "MEETING_MINUTES"
  | "TIMETABLES"
  | "LETTERS"
  | "FINANCIAL"
  | "SCHEDULES"
  | "OTHER";
export type AccessLevel = "ALL" | "ADMIN" | "SUPER_ADMIN" | "MINISTRY";
export type AudienceType = "ALL" | "MINISTRY" | "COURSE" | "FACULTY" | "HOSTEL" | "CUSTOM";
export type Priority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type EventStatus = "UPCOMING" | "ONGOING" | "COMPLETED" | "CANCELLED";
export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "APPROVE" | "REJECT" | "LOGIN" | "LOGOUT";

export interface SessionUser {
  userId: string;
  memberId: string | null;
  role: Role;
  email: string;
  username: string;
  name: string;
}

export interface Member {
  id: string;
  fullName: string;
  regNumber: string;
  phoneNumber: string;
  email: string | null;
  gender: Gender;
  faculty: string;
  department: string;
  course: string;
  yearOfStudy: YearOfStudy;
  hostel: string | null;
  homeRegion: string | null;
  emergencyContact: string | null;
  profilePhoto: string | null;
  biography: string | null;
  status: MemberStatus;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
  skills?: (MemberSkill & { skill: Skill })[];
  ministries?: (MinistryMember & { ministry: Ministry })[];
  user?: { id: string; role: Role; username: string; email: string; isActive: boolean; lastLoginAt: string | null } | null;
}

export interface Skill {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  createdAt: string;
  _count?: { members: number };
}

export interface MemberSkill {
  id: string;
  memberId: string;
  skillId: string;
  status: SkillStatus;
  proficiency: Proficiency | null;
  requestedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewerNote: string | null;
  member?: Member;
  skill?: Skill;
}

export interface Ministry {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  leaderId: string | null;
  assistantLeaderId: string | null;
  createdAt: string;
  updatedAt: string;
  leader?: Member | null;
  assistantLeader?: Member | null;
  members?: (MinistryMember & { member: Member })[];
  documents?: Document[];
  announcements?: Announcement[];
}

export interface MinistryMember {
  id: string;
  ministryId: string;
  memberId: string;
  role: MinistryRole;
  joinedAt: string;
}

export interface AttendanceSession {
  id: string;
  title: string;
  type: AttendanceType;
  date: string;
  ministryId: string | null;
  notes: string | null;
  createdAt: string;
  ministry?: Ministry | null;
  records?: (AttendanceRecord & { member: Member })[];
  presentCount?: number;
  totalCount?: number;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  memberId: string;
  present: boolean;
  reason: string | null;
  recordedAt: string;
}

export interface Document {
  id: string;
  title: string;
  description: string | null;
  category: DocumentCategory;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  ministryId: string | null;
  uploadedById: string | null;
  accessLevel: AccessLevel;
  downloads: number;
  createdAt: string;
  updatedAt: string;
  ministry?: Ministry | null;
  uploadedBy?: Member | null;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  audience: AudienceType;
  audienceRef: string | null;
  priority: Priority;
  smsSent: boolean;
  smsRecipients: number;
  authorId: string | null;
  ministryId: string | null;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  author?: Member | null;
  ministry?: Ministry | null;
  comments?: (Comment & { member: Member })[];
  _count?: { comments: number };
}

export interface Comment {
  id: string;
  announcementId: string;
  memberId: string;
  content: string;
  createdAt: string;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startDate: string;
  endDate: string | null;
  organizerId: string | null;
  ministryId: string | null;
  capacity: number | null;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
  organizer?: Member | null;
  registrations?: (EventRegistration & { member: Member })[];
  _count?: { registrations: number };
}

export interface EventRegistration {
  id: string;
  eventId: string;
  memberId: string;
  registeredAt: string;
  attended: boolean;
}

export interface Notification {
  id: string;
  memberId: string | null;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string | null;
  action: string;
  module: string;
  entityId: string | null;
  entityType: string | null;
  description: string;
  metadata: string | null;
  ipAddress: string | null;
  createdAt: string;
  actor?: { id: string; fullName: string; regNumber: string } | null;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

export interface UserAccount {
  id: string;
  email: string;
  username: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  member?: { id: string; fullName: string; regNumber: string } | null;
}

export interface DashboardData {
  kpis: {
    totalMembers: number;
    activeMembers: number;
    totalMinistries: number;
    totalSkills: number;
    pendingSkillRequests: number;
    upcomingEventsCount: number;
    attendanceRate: number;
  };
  upcomingEvents: (Event & { _count: { registrations: number } })[];
  recentAnnouncements: (Announcement & { author: Member | null; _count: { comments: number } })[];
  membersByFaculty: { faculty: string; _count: { _all: number } }[];
  membersByGender: { gender: string; _count: { _all: number } }[];
  membersByYearOfStudy: { yearOfStudy: string; _count: { _all: number } }[];
  recentAttendance: {
    id: string;
    title: string;
    type: string;
    date: string;
    present: number;
    total: number;
  }[];
}
