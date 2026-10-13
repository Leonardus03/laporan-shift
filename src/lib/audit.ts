import "server-only";
import type { ActorType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getClientIp, getUserAgent } from "@/lib/ip";

type AuditInput = {
  actorType: ActorType;
  actorId?: string | null;
  actorName: string;
  action: string;
  entity: string;
  entityId?: string | null;
  changes?: Prisma.InputJsonValue;
};

export async function logAudit(input: AuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        actorType: input.actorType,
        actorId: input.actorId ?? null,
        actorName: input.actorName,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        changes: input.changes,
        ipAddress: await getClientIp(),
        userAgent: await getUserAgent(),
      },
    });
  } catch (error) {
    console.error("Gagal mencatat audit log:", error);
  }
}
