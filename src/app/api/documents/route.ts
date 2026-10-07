import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { authorize, can } from "@/lib/rbac/permissions";
import { ROLES } from "@/lib/rbac/permissions";
import { auditLog } from "@/lib/services/audit";
import {
  ok,
  created,
  badRequest,
  unauthorized,
  notFound,
  serverError,
  withErrorHandler,
} from "@/lib/utils/api";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_SIZE = 25 * 1024 * 1024; // 25 MB

const ALLOWED_TYPES: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/webp": ["webp"],
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
    where.OR = [{ title: { contains: q } }, { description: { contains: q } }, { fileName: { contains: q } }];
  }

  // RBAC filtering: members only see ALL and their-ministry docs
  if (!can(current.user.role, "DOCUMENT_UPLOAD" as never)) {
    const myMinistryIds = await db.ministryMember.findMany({
      where: { memberId: current.user.memberId ?? "" },
      select: { ministryId: true },
    });
    where.OR = [
      { accessLevel: "ALL" },
      { ministryId: { in: myMinistryIds.map((m) => m.ministryId) }, accessLevel: "MINISTRY" },
    ];
  }

  const documents = await db.document.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { ministry: true, uploadedBy: true },
  });

  return ok({ items: documents });
});

// POST /api/documents — multipart upload
const POST = withErrorHandler(async (req: NextRequest) => {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  authorize(current.user.role, "DOCUMENT_UPLOAD");

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const title = formData.get("title") as string | null;
  const category = formData.get("category") as string | null;
  const description = (formData.get("description") as string | null) || "";
  const ministryId = (formData.get("ministryId") as string | null) || null;
  const accessLevel = (formData.get("accessLevel") as string | null) || "ALL";

  if (!file) return badRequest("File is required.");
  if (!title) return badRequest("Title is required.");
  if (!category) return badRequest("Category is required.");
  if (file.size > MAX_SIZE) return badRequest("File exceeds 25 MB limit.");

  const allowed = ALLOWED_TYPES[file.type];
  if (!allowed) return badRequest(`File type '${file.type}' is not allowed.`);

  if (!existsSync(UPLOAD_DIR)) await mkdir(UPLOAD_DIR, { recursive: true });
  const fileExt = allowed[0];
  const safeName = `${randomUUID()}.${fileExt}`;
  const filePath = path.join(UPLOAD_DIR, safeName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const document = await db.document.create({
    data: {
      title,
      description,
      category,
      fileName: file.name,
      filePath: `/uploads/${safeName}`,
      fileType: fileExt,
      fileSize: file.size,
      ministryId: ministryId || null,
      accessLevel,
      uploadedById: current.user.memberId,
    },
  });

  await auditLog({
    actorId: current.user.memberId,
    action: "CREATE",
    module: "DOCUMENTS",
    entityId: document.id,
    entityType: "Document",
    description: `Uploaded document '${title}' (${file.name}).`,
  });

  const fullDoc = await db.document.findUnique({
    where: { id: document.id },
    include: { ministry: true },
  });

  return created(fullDoc ?? document);
});

export { GET, POST };
