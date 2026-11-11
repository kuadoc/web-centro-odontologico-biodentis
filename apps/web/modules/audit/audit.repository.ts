import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export class AuditRepository {
  constructor(private readonly db: Prisma.TransactionClient = prisma) {}

  create(userId: string, action: string, resourceType: string, resourceId: string, details?: string) {
    return this.db.auditLog.create({ data: { userId, action, resourceType, resourceId, details } });
  }

  findByResource(resourceType: string, resourceId: string) {
    return this.db.auditLog.findMany({
      where: { resourceType, resourceId },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  findByUser(userId: string) {
    return this.db.auditLog.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  }
}
