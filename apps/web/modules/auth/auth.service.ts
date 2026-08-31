import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { RegisterSchema, LoginSchema } from "@workspace/shared-validators";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, TokenPayload } from "@/lib/auth";
import { AuthenticationError, DomainError, NotFoundError } from "@/lib/errors";
import { Role } from "@workspace/shared-validators";

export class AuthService {
  async register(data: unknown) {
    const parsed = RegisterSchema.parse(data);

    const existing = await prisma.user.findUnique({ where: { email: parsed.email } });
    if (existing) {
      throw new DomainError("El email ya está registrado", 409);
    }

    const passwordHash = await bcrypt.hash(parsed.password, 10);

    const user = await prisma.user.create({
      data: {
        email: parsed.email,
        passwordHash,
        role: parsed.role as Role,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        phone: parsed.phone,
      },
    });

    if (parsed.role === "DENTIST") {
      await prisma.dentist.create({
        data: { userId: user.id, specialty: "General" },
      });
    }

    const payload: TokenPayload = { userId: user.id, email: user.email, role: user.role as Role };
    return {
      user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
      accessToken: generateAccessToken(payload),
      refreshToken: generateRefreshToken(payload),
    };
  }

  async login(data: unknown) {
    const parsed = LoginSchema.parse(data);

    const user = await prisma.user.findUnique({ where: { email: parsed.email } });
    if (!user) {
      throw new AuthenticationError("Credenciales inválidas");
    }

    const valid = await bcrypt.compare(parsed.password, user.passwordHash);
    if (!valid) {
      throw new AuthenticationError("Credenciales inválidas");
    }

    const payload: TokenPayload = { userId: user.id, email: user.email, role: user.role as Role };
    return {
      user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
      accessToken: generateAccessToken(payload),
      refreshToken: generateRefreshToken(payload),
    };
  }

  async refresh(refreshToken: string) {
    const payload = verifyRefreshToken(refreshToken);

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      throw new NotFoundError("Usuario no encontrado");
    }

    const newPayload: TokenPayload = { userId: user.id, email: user.email, role: user.role as Role };
    return {
      accessToken: generateAccessToken(newPayload),
      refreshToken: generateRefreshToken(newPayload),
    };
  }
}
