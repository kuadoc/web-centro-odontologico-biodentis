import { AuthRepository } from "@/modules/auth/auth.repository";
import bcrypt from "bcrypt";
import { RegisterSchema, LoginSchema } from "@biodentis/shared-validators";
import { generateAccessToken, generateRefreshToken, hashToken, verifyRefreshToken } from "@/lib/auth";
import { AuthenticationError, DomainError, NotFoundError } from "@/lib/errors";

const REFRESH_EXPIRATION_DAYS = 7;

export class AuthService {
  constructor(private readonly authRepository = new AuthRepository()) {}

  async register(data: unknown) {
    const parsed = RegisterSchema.parse(data);

    const existing = await this.authRepository.findUserByEmail(parsed.email);
    if (existing) {
      throw new DomainError("El email ya está registrado", 409);
    }

    const passwordHash = await bcrypt.hash(parsed.password, 12);

    return this.authRepository.withTransaction(async (repository) => {
      const user = await repository.createPatient({
        email: parsed.email,
        passwordHash,
        role: "PATIENT",
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        dni: parsed.dni,
        phone: parsed.phone,
    });

    const { token: refreshToken, jti } = generateRefreshToken(user.id);
    const accessToken = generateAccessToken(user.id, jti);
    const tokenHash = hashToken(refreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRATION_DAYS);

    await repository.createRefreshToken({
      jti,
      tokenHash,
      userId: user.id,
      expiresAt,
    });

    return {
      user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
      accessToken,
      refreshToken,
    };
    });
  }

  async login(data: unknown) {
    const parsed = LoginSchema.parse(data);

    const user = await this.authRepository.findUserByEmail(parsed.email);
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

    const { token: refreshToken, jti } = generateRefreshToken(user.id);
    const accessToken = generateAccessToken(user.id, jti);
    const tokenHash = hashToken(refreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRATION_DAYS);

    await this.authRepository.createRefreshToken({
      jti,
      tokenHash,
      userId: user.id,
      expiresAt,
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

    const storedToken = await this.authRepository.findRefreshTokenByHash(tokenHash);

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

    const user = await this.authRepository.findUserById(payload.sub);
    if (!user) {
      throw new NotFoundError("Usuario no encontrado");
    }

    if (!user.isActive) {
      throw new AuthenticationError("Cuenta desactivada");
    }

    const { token: newRefreshToken, jti: newJti } = generateRefreshToken(user.id);
    const accessToken = generateAccessToken(user.id, newJti);
    const newTokenHash = hashToken(newRefreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRATION_DAYS);

    await this.authRepository.rotateRefreshToken(tokenHash, {
      jti: newJti,
      tokenHash: newTokenHash,
      userId: user.id,
      expiresAt,
    }, new Date());

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);

    await this.authRepository.revokeRefreshToken(tokenHash, new Date());
  }

  async revokeAllUserTokens(userId: string) {
    await this.authRepository.revokeAllUserTokens(userId, new Date());
  }
}
