import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { auditLog } from "@/lib/services/audit";
import {
  ok,
  badRequest,
  unauthorized,
  withErrorHandler,
} from "@/lib/utils/api";

export const runtime = "nodejs";

const POST = withErrorHandler(async (req: NextRequest) => {
  const current = await getCurrentUser({ includeMember: true });
  if (!current || !current.user.memberId) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body) return badRequest("Invalid form data.");

  const {
    regNumber,
    fullName,
    gender,
    maritalStatus,
    membershipCategory,
    phoneNumber,
    email,
    homeAddress,
    isBornAgain,
    bornAgainWhen,
    isBaptized,
    baptizedWhen,
    denomination,
    casfetaDiscovery,
    firstJoinDate,
    firstJoinLevel,
    firstJoinSchool,
    previousPosition,
    spiritualGifts,
    yearOfStudy,
    studyLevel,
    program,
    college,
    department,
    accommodationType,
    block,
    roomNo,
    offCampusLocation,
    declarationSigned,
  } = body;

  if (!fullName?.trim() || !regNumber?.trim() || !program?.trim() || !yearOfStudy) {
    return badRequest("Tafadhali jaza taarifa zote muhimu: Jina kamili, Namba ya usajili, Kozi na Mwaka wa masomo.");
  }

  if (!declarationSigned) {
    return badRequest("Tafadhali thibitisha na kukubali tamko la uanachama wa CASFETA UDSM.");
  }

  const isAssociate =
    membershipCategory === "ASSOCIATE" ||
    studyLevel === "MASTERS" ||
    studyLevel === "PHD" ||
    yearOfStudy === "ASSOCIATE";

  const effectiveCategory = isAssociate ? "ASSOCIATE" : "FULL";

  // Format accommodation text
  let hostelText = "Not specified";
  if (accommodationType === "OFF_CAMPUS") {
    hostelText = `Off campus: ${offCampusLocation || "Nje ya chuo"}`;
  } else if (accommodationType) {
    const accLabel =
      accommodationType === "MABIBO_HOSTEL"
        ? "Mabibo Hostel"
        : accommodationType === "MAGUFULI_HOSTEL"
        ? "Magufuli Hostel"
        : accommodationType === "COICT_HOSTEL"
        ? "CoICT Hostel"
        : "Main Campus";
    hostelText = `${accLabel} (Block: ${block || "-"}, Room: ${roomNo || "-"})`;
  }

  // Pack religious and admission metadata into structured JSON
  const registrationMetadata = {
    isRegistrationComplete: true,
    completedAt: new Date().toISOString(),
    membershipCategory: effectiveCategory,
    membershipType: effectiveCategory,
    personal: {
      maritalStatus: maritalStatus || "Not specified",
      homeAddress: homeAddress || "",
    },
    religious: {
      isBornAgain: isBornAgain || "Not yet",
      bornAgainWhen: bornAgainWhen || "",
      isBaptized: isBaptized || "Not yet",
      baptizedWhen: baptizedWhen || "",
      denomination: denomination || "",
      casfetaDiscovery: casfetaDiscovery || "",
      firstJoin: {
        date: firstJoinDate || "",
        level: firstJoinLevel || "",
        school: firstJoinSchool || "",
      },
      previousPosition: previousPosition || "",
      spiritualGifts: spiritualGifts || "",
    },
    admission: {
      studyLevel: studyLevel || "Bachelor",
      college: college || "",
      department: department || college || "",
      program,
      accommodationType,
      block,
      roomNo,
      offCampusLocation,
    },
    declarationSigned: true,
  };

  // Check if regNumber is already used by another member
  const existingWithReg = await db.member.findUnique({
    where: { regNumber: regNumber.trim() },
  });
  if (existingWithReg && existingWithReg.id !== current.user.memberId) {
    return badRequest("Namba hii ya usajili (Registration Number) tayari inatumiwa na mwanachama mwingine.");
  }

  // Update member record in DB
  const updatedMember = await db.member.update({
    where: { id: current.user.memberId },
    data: {
      fullName: fullName.trim(),
      regNumber: regNumber.trim(),
      gender: gender === "FEMALE" ? "FEMALE" : "MALE",
      phoneNumber: phoneNumber?.trim() || current.member?.phoneNumber || "Not provided",
      email: email?.trim() || current.user.email,
      faculty: college || "UDSM",
      department: department?.trim() || college || "General",
      course: program.trim(),
      yearOfStudy: yearOfStudy || "YEAR_1",
      hostel: hostelText,
      homeRegion: homeAddress?.trim() || null,
      biography: JSON.stringify(registrationMetadata),
    },
  });

  await auditLog({
    actorId: current.user.memberId,
    action: "UPDATE",
    module: "MEMBERS",
    entityId: current.user.memberId,
    entityType: "Member",
    description: `Member ${updatedMember.fullName} completed official registration form.`,
  });

  return ok({
    success: true,
    member: updatedMember,
    message: "Usajili wako wa CASFETA UDSM umekamilika kikamilifu! Karibu sana.",
  });
});

export { POST };
