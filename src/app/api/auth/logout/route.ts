import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";
import { withErrorHandler, ok } from "@/lib/utils/api";

export const runtime = "nodejs";

const POST = withErrorHandler(async () => {
  await destroySession();
  return ok({ success: true });
});

export { POST };
