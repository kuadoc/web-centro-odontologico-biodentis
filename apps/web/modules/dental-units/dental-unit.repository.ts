import { prisma } from "@/lib/prisma";
import { DentalUnitType, DentalUnitStatus } from "@biodentis/shared-types";

export class DentalUnitRepository {
  async findAll() {
    return prisma.dentalUnit.findMany({
      orderBy: { name: "asc" },
    });
  }

  async findById(id: string) {
    return prisma.dentalUnit.findUnique({ where: { id } });
  }

  async findByType(type: DentalUnitType) {
    return prisma.dentalUnit.findMany({
      where: { type },
      orderBy: { name: "asc" },
    });
  }

  async findByStatus(status: DentalUnitStatus) {
    return prisma.dentalUnit.findMany({
      where: { status },
      orderBy: { name: "asc" },
    });
  }

  async countByStatus() {
    const [active, maintenance, inactive] = await Promise.all([
      prisma.dentalUnit.count({ where: { status: "ACTIVE" } }),
      prisma.dentalUnit.count({ where: { status: "MAINTENANCE" } }),
      prisma.dentalUnit.count({ where: { status: "INACTIVE" } }),
    ]);
    return { active, maintenance, inactive, total: active + maintenance + inactive };
  }

  async create(data: { name: string; type: DentalUnitType; status?: DentalUnitStatus; description?: string }) {
    return prisma.dentalUnit.create({ data });
  }

  async update(id: string, data: { name?: string; type?: DentalUnitType; status?: DentalUnitStatus; description?: string }) {
    return prisma.dentalUnit.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.dentalUnit.delete({ where: { id } });
  }
}
