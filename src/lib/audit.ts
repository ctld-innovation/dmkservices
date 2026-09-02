import { prisma } from "./prisma";
import type { SessionUser } from "./auth";

export async function writeAudit(
  user: SessionUser | null,
  entity: string,
  entityId: string,
  action: string,
  details?: unknown,
) {
  await prisma.auditLog.create({
    data: {
      entity,
      entityId,
      action,
      userId: user?.id,
      details: details ? JSON.stringify(details) : null,
    },
  });
}
