import { prisma } from "@/lib/prisma";

export class DentistRepository {
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
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } },
    });
  }

  async findBySpecialty(specialty: string) {
    return prisma.dentist.findMany({
      where: { specialty },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } },
    });
  }
}
