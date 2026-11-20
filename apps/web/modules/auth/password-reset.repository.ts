import { prisma } from "@/lib/prisma";
import { DomainError } from "@/lib/errors";

export class PasswordResetRepository {
  issue(userId: string, tokenHash: string, expiresAt: Date) {
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      await tx.passwordResetToken.deleteMany({ where: { userId, usedAt: null } });
      return tx.passwordResetToken.create({ data: { userId, tokenHash, expiresAt } });
    });
  }
  find(tokenHash: string) {
    return prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  }

  reset(id: string, userId: string, passwordHash: string) {
    return prisma.$transaction(async (tx) => {
      // Mismo orden de bloqueo que issue(): usuario antes del token.
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      const now = new Date();
      const claimed = await tx.passwordResetToken.updateMany({
        where: { id, userId, usedAt: null, expiresAt: { gte: now } }, data: { usedAt: now },
      });
      if (claimed.count !== 1) throw new DomainError("Token inválido, utilizado o expirado", 400);
      await tx.user.update({ where: { id: userId }, data: { passwordHash } });
      await tx.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } });
    });
  }
}
