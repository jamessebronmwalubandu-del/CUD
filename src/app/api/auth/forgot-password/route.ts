import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/services/audit";
import { ok, badRequest, withErrorHandler } from "@/lib/utils/api";

export const runtime = "nodejs";

/**
 * POST /api/auth/forgot-password
 * Handles password reset assistance requests.
 * Records the request in system audit logs and informs the user to either
 * check their email or contact their CASFETA fellowship administrator.
 */
const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json().catch(() => null);
  if (!body) return badRequest("Invalid JSON body.");

  const identifier = (body.identifier as string | undefined)?.trim();
  if (!identifier) {
    return badRequest("Please provide your email address or username.");
  }

  const user = await db.user.findFirst({
    where: {
      OR: [{ email: identifier.toLowerCase() }, { username: identifier.toLowerCase() }],
    },
    include: { member: true },
  });

  if (user) {
    // Record password reset request in audit logs so administrators can assist
    await auditLog({
      actorId: user.memberId,
      action: "UPDATE",
      module: "AUTH",
      entityId: user.id,
      entityType: "User",
      description: `Password reset requested for user '${user.username}' (${user.email}).`,
      metadata: { username: user.username, email: user.email },
    });
  }

  // Consistent message to prevent email/username enumeration attacks
  return ok({
    message:
      "If an account is associated with this email or username, password recovery assistance has been recorded. You can also contact your CASFETA fellowship administrator to have your password reset directly in Settings.",
  });
});

export { POST };
