import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export class DentistRepository {
  constructor(private readonly db: Prisma.TransactionClient = prisma) {}

  async findPublicProfiles() {
    return this.db.dentist.findMany({
      where: { user: { role: "DENTIST", isActive: true } },
      select: {
        id: true,
        specialty: true,
        licenseNumber: true,
        university: true,
        user: { select: { firstName: true, lastName: true, avatarUrl: true } },
      },
      orderBy: [{ user: { firstName: "asc" } }, { user: { lastName: "asc" } }, { id: "asc" }],
    });
  }

  async findById(id: string) {
    return prisma.dentist.findUnique({
      where: { id },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } },
    });
  }

  async findByUserId(userId: string) {
    return prisma.dentist.findUnique({
      where: { userId },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } },
    });
  }

  async findAll() {
    return prisma.dentist.findMany({
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, isActive: true, role: true } } },
    });
  }

  async findBySpecialty(specialty: string) {
    return prisma.dentist.findMany({
      where: { specialty },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } },
    });
  }
}
