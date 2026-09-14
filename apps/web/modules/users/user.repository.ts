import { prisma } from "@/lib/prisma";
import { nextPatientCode } from "@/lib/patient-code";
import { Role } from "@biodentis/shared-types";

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
      select: { id: true, email: true, role: true, firstName: true, lastName: true, phone: true, address: true, isActive: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async countByRole() {
    const counts = await prisma.user.groupBy({
      by: ["role"],
      _count: { id: true },
    });
    return counts.reduce((acc, item) => {
      acc[item.role] = item._count.id;
      return acc;
    }, {} as Record<Role, number>);
  }

  async create(data: {
    email: string;
    passwordHash: string;
    role: Role;
    firstName: string;
    lastName: string;
    phone?: string;
    address?: string;
  }) {
    // Los pacientes reciben su codigo visible (#PAC-0001) al darse de alta.
    const patientCode = data.role === "PATIENT" ? await nextPatientCode() : undefined;
    return prisma.user.create({ data: { ...data, patientCode } });
  }

  async update(id: string, data: { firstName?: string; lastName?: string; phone?: string; address?: string; role?: Role; isActive?: boolean }) {
    return prisma.user.update({ where: { id }, data });
  }

  async updatePassword(id: string, passwordHash: string) {
    return prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  async delete(id: string) {
    return prisma.user.delete({ where: { id } });
  }
}
