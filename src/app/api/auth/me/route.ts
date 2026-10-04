import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { ok, unauthorized, badRequest, withErrorHandler } from "@/lib/utils/api";
import type { Member } from "@prisma/client";

export const runtime = "nodejs";

const GET = withErrorHandler(async () => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  const { user, member } = current;
  return ok({
    user,
    member: member
      ? {
          id: member.id,
          fullName: member.fullName,
          regNumber: member.regNumber,
          email: member.email,
          phoneNumber: member.phoneNumber,
          gender: member.gender,
          faculty: member.faculty,
          department: member.department,
          course: member.course,
          yearOfStudy: member.yearOfStudy,
          hostel: member.hostel,
          homeRegion: member.homeRegion,
          emergencyContact: member.emergencyContact,
          profilePhoto: member.profilePhoto,
          biography: member.biography,
          status: member.status,
          ministries: member.ministries
            ? member.ministries.map((mm) => ({
                id: mm.id,
                role: mm.role,
                ministry: { id: mm.ministry.id, name: mm.ministry.name, color: mm.ministry.color },
              }))
            : [],
        }
      : null,
  });
});

const PATCH = withErrorHandler(async (req: NextRequest) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();

  const body = await req.json();
  const {
    fullName,
    email,
    username,
    biography,
    profilePhoto,
    phoneNumber,
    hostel,
    homeRegion,
    emergencyContact,
  } = body;

  // Validate username uniqueness if changed
  if (username && username.trim() !== "" && username.trim() !== current.user.username) {
    const existingUser = await db.user.findUnique({ where: { username: username.trim() } });
    if (existingUser && existingUser.id !== current.user.userId) {
      return badRequest("Username is already taken");
    }
  }

  // Validate email uniqueness if changed
  if (email && email.trim() !== "" && email.trim() !== current.user.email) {
    const existingUser = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existingUser && existingUser.id !== current.user.userId) {
      return badRequest("Email is already registered");
    }
  }

  const cleanEmail = email !== undefined ? email.trim() : undefined;
  const cleanUsername = username !== undefined ? username.trim() : undefined;
  const cleanFullName = fullName !== undefined ? fullName.trim() : undefined;

  // Update User record
  const updatedUser = await db.user.update({
    where: { id: current.user.userId },
    data: {
      ...(cleanEmail !== undefined ? { email: cleanEmail } : {}),
      ...(cleanUsername !== undefined ? { username: cleanUsername } : {}),
    },
  });

  // Update Member record if linked
  let updatedMember: Member | null = null;
  if (current.member) {
    updatedMember = await db.member.update({
      where: { id: current.member.id },
      data: {
        ...(cleanFullName !== undefined ? { fullName: cleanFullName } : {}),
        ...(cleanEmail !== undefined ? { email: cleanEmail } : {}),
        ...(biography !== undefined ? { biography: biography ? biography.trim() : null } : {}),
        ...(profilePhoto !== undefined ? { profilePhoto } : {}),
        ...(phoneNumber !== undefined ? { phoneNumber: phoneNumber.trim() } : {}),
        ...(hostel !== undefined ? { hostel: hostel ? hostel.trim() : null } : {}),
        ...(homeRegion !== undefined ? { homeRegion: homeRegion ? homeRegion.trim() : null } : {}),
        ...(emergencyContact !== undefined ? { emergencyContact: emergencyContact ? emergencyContact.trim() : null } : {}),
      },
    });
  }

  return ok({
    user: {
      userId: updatedUser.id,
      memberId: updatedUser.memberId,
      role: updatedUser.role,
      email: updatedUser.email,
      username: updatedUser.username,
      name: updatedMember?.fullName ?? updatedUser.username,
    },
    member: updatedMember,
  });
});

export { GET, PATCH };
