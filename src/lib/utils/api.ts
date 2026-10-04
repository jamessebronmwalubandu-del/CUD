import { NextResponse } from "next/server";

/**
 * Standardised API response helpers.
 */

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function created<T>(data: T) {
  return NextResponse.json({ success: true, data }, { status: 201 });
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function badRequest(message = "Bad request", details?: unknown) {
  return NextResponse.json(
    { success: false, error: message, details },
    { status: 400 }
  );
}

export function unauthorized(message = "Authentication required.") {
  return NextResponse.json({ success: false, error: message }, { status: 401 });
}

export function forbidden(message = "You are not authorized to perform this action.") {
  return NextResponse.json({ success: false, error: message }, { status: 403 });
}

export function notFound(message = "Resource not found.") {
  return NextResponse.json({ success: false, error: message }, { status: 404 });
}

export function conflict(message = "Conflict.") {
  return NextResponse.json({ success: false, error: message }, { status: 409 });
}

export function serverError(message = "Internal server error.", details?: unknown) {
  console.error("[serverError]", message, details);
  return NextResponse.json(
    { success: false, error: message, details: details instanceof Error ? details.message : details },
    { status: 500 }
  );
}

/**
 * Wrap an async route handler with normalised error handling.
 */
export function withErrorHandler<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<NextResponse>
): (...args: TArgs) => Promise<NextResponse> {
  return async (...args: TArgs) => {
    try {
      return await handler(...args);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      if (message === "UNAUTHENTICATED") return unauthorized();
      if (message === "FORBIDDEN") return forbidden();
      if (message.startsWith("NOT_FOUND:")) return notFound(message.slice(11));
      if (message.startsWith("BAD_REQUEST:")) return badRequest(message.slice(13));
      if (message.startsWith("CONFLICT:")) return conflict(message.slice(9));
      return serverError(message, err);
    }
  };
}
