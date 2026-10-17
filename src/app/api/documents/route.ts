import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { authorize, can } from "@/lib/rbac/permissions";
import { auditLog } from "@/lib/services/audit";
import {
  ok,
  created,
  badRequest,
  unauthorized,
  withErrorHandler,
} from "@/lib/utils/api";

export const runtime = "nodejs";

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xls",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

// GET /api/documents — list with filters
const GET = withErrorHandler(async (req: NextRequest) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "DOCUMENT_VIEW");

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const q = searchParams.get("q")?.trim();
  const ministryId = searchParams.get("ministryId");

  const where: Record<string, unknown> = {};
  if (category) where.category = category;
  if (ministryId) where.ministryId = ministryId;
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
      { fileName: { contains: q } },
    ];
  }

  // RBAC: non-uploaders only see ALL docs and their-ministry docs
  if (!can(current.user.role, "DOCUMENT_UPLOAD" as never)) {
    const myMinistryIds = await db.ministryMember.findMany({
      where: { memberId: current.user.memberId ?? "" },
      select: { ministryId: true },
    });
    where.OR = [
      { accessLevel: "ALL" },
      {
        ministryId: { in: myMinistryIds.map((m) => m.ministryId) },
        accessLevel: "MINISTRY",
      },
    ];
  }

  const documents = await db.document.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      ministry: { select: { id: true, name: true, color: true } },
      uploadedBy: { select: { id: true, fullName: true } },
    },
  });

  return ok({ items: documents });
});

/**
 * POST /api/documents
 *
 * Accepts JSON (application/json) with the file already uploaded to UploadThing.
 * The client uploads via useUploadThing, gets back a URL, then calls this endpoint
 * to persist the document metadata.
 *
 * Body: {
 *   title: string
 *   description?: string
 *   category: string
 *   ministryId?: string
 *   accessLevel?: string
 *   fileUrl: string        — UploadThing ufsUrl
 *   fileName: string       — original filename
 *   fileType: string       — mime type
 *   fileSize: number       — bytes
 * }
 */
const POST = withErrorHandler(async (req: NextRequest) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "DOCUMENT_UPLOAD");

  const body = await req.json().catch(() => null);
  if (!body) return badRequest("Invalid JSON body.");

  const { title, description, category, ministryId, accessLevel, fileUrl, fileName, fileType, fileSize } = body;

  if (!title?.trim()) return badRequest("Title is required.");
  if (!category) return badRequest("Category is required.");
  if (!fileUrl) return badRequest("fileUrl is required.");
  if (!fileName) return badRequest("fileName is required.");
  if (!fileType) return badRequest("fileType is required.");

  const ext = ALLOWED_TYPES[fileType] ?? fileName.split(".").pop()?.toLowerCase() ?? "bin";

  const document = await db.document.create({
    data: {
      title: title.trim(),
      description: description?.trim() ?? "",
      category,
      fileName,
      filePath: fileUrl,          // store the UploadThing URL directly
      fileType: ext,
      fileSize: fileSize ?? 0,
      ministryId: ministryId || null,
      accessLevel: accessLevel || "ALL",
      uploadedById: current.user.memberId,
    },
  });

  await auditLog({
    actorId: current.user.memberId,
    action: "CREATE",
    module: "DOCUMENTS",
    entityId: document.id,
    entityType: "Document",
    description: `Uploaded document '${title}' (${fileName}).`,
  });

  const fullDoc = await db.document.findUnique({
    where: { id: document.id },
    include: { ministry: true, uploadedBy: { select: { id: true, fullName: true } } },
  });

  return created(fullDoc ?? document);
});

export { GET, POST };
