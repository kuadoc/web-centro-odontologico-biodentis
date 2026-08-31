import { prisma } from "@/lib/prisma";
import { Role } from "@workspace/shared-validators";

export class UserRepository {
  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  async findMany(filter?: { role?: Role }) {
    return prisma.user.findMany({
      where: filter?.role ? { role: filter.role } : undefined,
      select: { id: true, email: true, role: true, firstName: true, lastName: true, phone: true, createdAt: true },
    });
  }

  async update(id: string, data: { firstName?: string; lastName?: string; phone?: string }) {
    return prisma.user.update({ where: { id }, data });
  }
}
