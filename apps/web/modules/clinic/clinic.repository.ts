import { prisma } from "@/lib/prisma";

export class ClinicRepository {
  async findFirst() {
    return prisma.clinic.findFirst();
  }

  async update(id: string, data: { name?: string; address?: string; phone?: string; generalHours?: string }) {
    return prisma.clinic.update({ where: { id }, data });
  }

  async create(data: { name: string; address?: string; phone?: string; generalHours?: string }) {
    return prisma.clinic.create({ data });
  }
}
