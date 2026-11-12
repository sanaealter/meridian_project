import { db } from "@/db";
import { auditLog } from "@/db/schema";

export async function audit(
  actorId: string,
  action: string,
  targetType: string,
  targetId: string,
  details?: Record<string, unknown>,
) {
  await db.insert(auditLog).values({ actorId, action, targetType, targetId, details });
}
