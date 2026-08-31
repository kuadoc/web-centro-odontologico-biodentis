import { PrismaClient, Role as PrismaRole } from "@prisma/client";
import { AuthRepository, CreateUserData, AuthUser } from "../domain/AuthRepository";

const prisma = new PrismaClient();

export class PrismaAuthRepository implements AuthRepository {
  async findByEmail(email: string): Promise<AuthUser | null> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role as unknown as CreateUserData["role"],
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  async create(data: CreateUserData): Promise<AuthUser> {
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role as unknown as PrismaRole,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      },
    });
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role as unknown as CreateUserData["role"],
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  async storeRefreshToken(_userId: string, _token: string): Promise<void> {
    // In production, store in Redis or a dedicated table
  }

  async findRefreshToken(token: string): Promise<string | null> {
    // Simplified - in production validate against stored tokens
    return token;
  }

  async deleteRefreshToken(_token: string): Promise<void> {
    // In production, delete from Redis or a dedicated table
  }

  async deleteAllRefreshTokens(_userId: string): Promise<void> {
    // In production, delete all tokens for user from Redis or a dedicated table
  }
}
