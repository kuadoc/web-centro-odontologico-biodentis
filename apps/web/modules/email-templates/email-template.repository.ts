import { prisma } from "@/lib/prisma";

export class EmailTemplateRepository {
  async findAll() {
    return prisma.emailTemplate.findMany({
      orderBy: { key: "asc" },
    });
  }

  async findById(id: string) {
    return prisma.emailTemplate.findUnique({ where: { id } });
  }

  async findByKey(key: string) {
    return prisma.emailTemplate.findUnique({ where: { key } });
  }

  async findActive() {
    return prisma.emailTemplate.findMany({
      where: { isActive: true },
      orderBy: { key: "asc" },
    });
  }

  async create(data: { key: string; name: string; subject: string; body: string; isActive?: boolean }) {
    return prisma.emailTemplate.create({ data });
  }

  async update(id: string, data: { name?: string; subject?: string; body?: string; isActive?: boolean }) {
    return prisma.emailTemplate.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.emailTemplate.delete({ where: { id } });
  }
}
