import { db } from "@/lib/db";

/**
 * Append an entry to the audit log.
 * Best-effort: never throws (logging must not break the calling operation).
 */
export async function auditLog(params: {
  actorId?: string | null;
  action: string;
  module: string;
  entityId?: string | null;
  entityType?: string | null;
  description: string;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
}): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorId: params.actorId ?? null,
        action: params.action,
        module: params.module,
        entityId: params.entityId ?? null,
        entityType: params.entityType ?? null,
        description: params.description,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        ipAddress: params.ipAddress ?? null,
      },
    });
  } catch (err) {
    // Don't propagate — audit logging is best-effort
    console.error("[auditLog] failed to write audit log:", err);
  }
}
