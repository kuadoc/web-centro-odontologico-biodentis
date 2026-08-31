import { PrismaClient } from "@prisma/client";
import { UserRepository, UserProfile } from "../domain/UserRepository";
import { Role } from "@biodentis/shared-types";

const prisma = new PrismaClient();

export class PrismaUserRepository implements UserRepository {
  async findById(id: string): Promise<UserProfile | null> {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    return this.toProfile(user);
  }

  async update(id: string, data: { firstName?: string; lastName?: string; phone?: string }): Promise<UserProfile> {
    const user = await prisma.user.update({ where: { id }, data });
    return this.toProfile(user);
  }

  async findAll(): Promise<UserProfile[]> {
    const users = await prisma.user.findMany();
    return users.map(this.toProfile);
  }

  async findByRole(role: Role): Promise<UserProfile[]> {
    const users = await prisma.user.findMany({ where: { role } });
    return users.map(this.toProfile);
  }

  private toProfile(user: any): UserProfile {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
