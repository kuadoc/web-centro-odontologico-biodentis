import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { nextPatientCode } from "@/lib/patient-code";

type RefreshTokenData = Pick<
  Prisma.RefreshTokenUncheckedCreateInput,
  "jti" | "tokenHash" | "userId" | "expiresAt"
>;

export class AuthRepository {
  findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  findUserById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  async createPatient(data: Pick<
    Prisma.UserCreateInput,
    "email" | "passwordHash" | "role" | "firstName" | "lastName" | "phone"
  >) {
    return prisma.user.create({
      data: { ...data, patientCode: await nextPatientCode() },
    });
  }

  createRefreshToken(data: RefreshTokenData) {
    return prisma.refreshToken.create({ data });
  }

  findRefreshTokenByHash(tokenHash: string) {
    return prisma.refreshToken.findUnique({ where: { tokenHash } });
  }

  rotateRefreshToken(tokenHash: string, replacement: RefreshTokenData, revokedAt: Date) {
    return prisma.$transaction([
      prisma.refreshToken.update({
        where: { tokenHash },
        data: { revokedAt, replacedByToken: replacement.jti },
      }),
      prisma.refreshToken.create({ data: replacement }),
    ]);
  }

  revokeRefreshToken(tokenHash: string, revokedAt: Date) {
    return prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt },
    });
  }

  revokeAllUserTokens(userId: string, revokedAt: Date) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt },
    });
  }
}
