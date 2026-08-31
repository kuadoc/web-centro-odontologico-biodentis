import { PrismaClient } from "@prisma/client";
import { ClinicRepository, ClinicData } from "../domain/ClinicRepository";

const prisma = new PrismaClient();

export class PrismaClinicRepository implements ClinicRepository {
  async find(): Promise<ClinicData | null> {
    const clinic = await prisma.clinic.findFirst();
    return clinic;
  }

  async update(data: { name?: string; address?: string; phone?: string; generalHours?: string }): Promise<ClinicData> {
    const existing = await prisma.clinic.findFirst();
    if (existing) {
      return prisma.clinic.update({ where: { id: existing.id }, data });
    }
    return prisma.clinic.create({ data: { name: data.name || "Centro Odontológico BIODENTIS", ...data } });
  }
}
