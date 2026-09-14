import { prisma } from "@/lib/prisma";
import { nextPatientCode } from "@/lib/patient-code";
import bcrypt from "bcrypt";
import { RegisterSchema, LoginSchema } from "@biodentis/shared-validators";
import { generateAccessToken, generateRefreshToken, hashToken, verifyRefreshToken } from "@/lib/auth";
import { AuthenticationError, DomainError, NotFoundError } from "@/lib/errors";

const REFRESH_EXPIRATION_DAYS = 7;

export class AuthService {
  async register(data: unknown) {
    const parsed = RegisterSchema.parse(data);

    const existing = await prisma.user.findUnique({ where: { email: parsed.email } });
    if (existing) {
      throw new DomainError("El email ya está registrado", 409);
    }

    const passwordHash = await bcrypt.hash(parsed.password, 12);

    const user = await prisma.user.create({
      data: {
        email: parsed.email,
        passwordHash,
        role: "PATIENT",
        patientCode: await nextPatientCode(),
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        phone: parsed.phone,
      },
    });

    const accessToken = generateAccessToken(user.id);
    const { token: refreshToken, jti } = generateRefreshToken(user.id);
    const tokenHash = hashToken(refreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRATION_DAYS);

    await prisma.refreshToken.create({
      data: {
        jti,
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
      accessToken,
      refreshToken,
    };
  }

  async login(data: unknown) {
    const parsed = LoginSchema.parse(data);

    const user = await prisma.user.findUnique({ where: { email: parsed.email } });
    if (!user) {
      throw new AuthenticationError("Credenciales inválidas");
    }

    if (!user.isActive) {
      throw new AuthenticationError("Cuenta desactivada. Contacte al administrador.");
    }

    const valid = await bcrypt.compare(parsed.password, user.passwordHash);
    if (!valid) {
      throw new AuthenticationError("Credenciales inválidas");
    }

    const accessToken = generateAccessToken(user.id);
    const { token: refreshToken, jti } = generateRefreshToken(user.id);
    const tokenHash = hashToken(refreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRATION_DAYS);

    await prisma.refreshToken.create({
      data: {
        jti,
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    const payload = verifyRefreshToken(refreshToken);
    const tokenHash = hashToken(refreshToken);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!storedToken) {
      throw new AuthenticationError("Refresh token inválido");
    }

    if (storedToken.revokedAt) {
      await this.revokeAllUserTokens(storedToken.userId);
      throw new AuthenticationError("Refresh token revocado — sesión cerrada por seguridad");
    }

    if (storedToken.expiresAt < new Date()) {
      throw new AuthenticationError("Refresh token expirado");
    }

    if (storedToken.userId !== payload.sub) {
      throw new AuthenticationError("Refresh token no pertenece a este usuario");
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new NotFoundError("Usuario no encontrado");
    }

    if (!user.isActive) {
      throw new AuthenticationError("Cuenta desactivada");
    }

    const accessToken = generateAccessToken(user.id);
    const { token: newRefreshToken, jti: newJti } = generateRefreshToken(user.id);
    const newTokenHash = hashToken(newRefreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRATION_DAYS);

    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { tokenHash },
        data: {
          revokedAt: new Date(),
          replacedByToken: newJti,
        },
      }),
      prisma.refreshToken.create({
        data: {
          jti: newJti,
          tokenHash: newTokenHash,
          userId: user.id,
          expiresAt,
        },
      }),
    ]);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);

    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllUserTokens(userId: string) {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
