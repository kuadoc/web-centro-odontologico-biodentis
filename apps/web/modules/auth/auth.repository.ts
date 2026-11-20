import { Prisma } from "@prisma/client";
import { AuthenticationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { nextPatientCode } from "@/lib/patient-code";

type RefreshTokenData = Pick<
  Prisma.RefreshTokenUncheckedCreateInput,
  "jti" | "tokenHash" | "userId" | "expiresAt"
>;

export class AuthRepository {
  constructor(private readonly db: Prisma.TransactionClient = prisma) {}

  withTransaction<T>(operation: (repository: AuthRepository) => Promise<T>) {
    return prisma.$transaction((tx) => operation(new AuthRepository(tx)));
  }
  async findUserByEmail(email: string) {
    const exact = await prisma.user.findUnique({ where: { email } });
    // Compatibilidad con cuentas creadas antes de normalizar el correo al registrar.
    return exact ?? prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  }

  findUserById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  async createPatient(data: Pick<
    Prisma.UserCreateInput,
    "email" | "passwordHash" | "role" | "firstName" | "lastName" | "dni" | "phone"
  >) {
    return this.db.user.create({
      data: { ...data, patientCode: await nextPatientCode(this.db) },
    });
  }

  createRefreshToken(data: RefreshTokenData) {
    return this.db.refreshToken.create({ data });
  }

  findRefreshTokenByHash(tokenHash: string) {
    return prisma.refreshToken.findUnique({ where: { tokenHash } });
  }

  async rotateRefreshToken(tokenHash: string, replacement: RefreshTokenData, revokedAt: Date) {
    try { return await prisma.$transaction([
      prisma.refreshToken.update({
        where: { tokenHash, revokedAt: null, expiresAt: { gte: revokedAt } },
        data: { revokedAt, replacedByToken: replacement.jti },
      }),
      prisma.refreshToken.create({ data: replacement }),
    ]); } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new AuthenticationError("Refresh token ya utilizado o expirado");
      }
      throw error;
    }
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
