import { prisma } from "@/lib/prisma";

export class AccessSessionRepository {
  findByJti(jti: string) {
    return prisma.refreshToken.findUnique({
      where: { jti },
      select: {
        userId: true,
        revokedAt: true,
        expiresAt: true,
        user: { select: { id: true, role: true, isActive: true } },
      },
    });
  }
}
