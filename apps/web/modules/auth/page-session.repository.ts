import { prisma } from "@/lib/prisma";

export class PageSessionRepository {
  findByTokenHash(tokenHash: string) {
    return prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: {
        userId: true,
        jti: true,
        revokedAt: true,
        expiresAt: true,
        user: { select: { id: true, role: true, isActive: true } },
      },
    });
  }
}
