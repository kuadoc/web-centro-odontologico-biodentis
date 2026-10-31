import { prisma } from "@/lib/prisma";
import { nextPatientCode } from "@/lib/patient-code";
import { Role } from "@biodentis/shared-types";
import type { Prisma } from "@prisma/client";

export class UserRepository {
  constructor(private readonly db: Prisma.TransactionClient = prisma) {}

  async findById(id: string) {
    return this.db.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string) {
    return this.db.user.findUnique({ where: { email } });
  }

  async findMany(filter?: { role?: Role }) {
    return this.db.user.findMany({
      where: filter?.role ? { role: filter.role } : undefined,
      select: { id: true, email: true, role: true, firstName: true, lastName: true, phone: true, address: true, avatarUrl: true, isActive: true, createdAt: true, updatedAt: true, dentistProfile: { select: { id: true, specialty: true, licenseNumber: true, university: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async countByRole() {
    const counts = await this.db.user.groupBy({
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
    avatarUrl?: string | null;
    dentistProfile?: { specialty: string; licenseNumber?: string | null; university?: string | null };
  }) {
    // Los pacientes reciben su codigo visible (#PAC-0001) al darse de alta.
    const patientCode = data.role === "PATIENT" ? await nextPatientCode() : undefined;
    const { dentistProfile, ...userData } = data;
    return this.db.user.create({ data: { ...userData, patientCode, ...(dentistProfile ? { dentistProfile: { create: dentistProfile } } : {}) } });
  }

  async update(id: string, data: Prisma.UserUpdateInput) {
    return this.db.user.update({ where: { id }, data });
  }

  async updatePassword(id: string, passwordHash: string) {
    return this.db.user.update({ where: { id }, data: { passwordHash } });
  }

  async delete(id: string) {
    return this.db.user.delete({ where: { id } });
  }
}
