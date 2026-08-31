import { prisma } from "@/lib/prisma";

export class AuditService {
  async log(userId: string, action: string, resourceType: string, resourceId: string, details?: string) {
    return prisma.auditLog.create({
      data: { userId, action, resourceType, resourceId, details },
    });
  }

  async findByResource(resourceType: string, resourceId: string) {
    return prisma.auditLog.findMany({
      where: { resourceType, resourceId },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByUser(userId: string) {
    return prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }
}
