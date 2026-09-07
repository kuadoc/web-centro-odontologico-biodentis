import { prisma } from "@/lib/prisma";
import type { SettingType } from "@biodentis/shared-types";

export class SystemSettingRepository {
  async findAll() {
    return prisma.systemSetting.findMany({
      orderBy: { key: "asc" },
    });
  }

  async findByKey(key: string) {
    return prisma.systemSetting.findUnique({ where: { key } });
  }

  async findByKeys(keys: string[]) {
    return prisma.systemSetting.findMany({
      where: { key: { in: keys } },
    });
  }

  async findByNameGroup(prefix: string) {
    return prisma.systemSetting.findMany({
      where: { key: { startsWith: prefix } },
      orderBy: { key: "asc" },
    });
  }

  async upsert(key: string, value: string, type: SettingType = "STRING" as SettingType) {
    return prisma.systemSetting.upsert({
      where: { key },
      update: { value, type },
      create: { key, value, type },
    });
  }

  async bulkUpsert(settings: { key: string; value: string }[]) {
    const operations = settings.map((s) =>
      prisma.systemSetting.upsert({
        where: { key: s.key },
        update: { value: s.value },
        create: { key: s.key, value: s.value, type: "STRING" },
      })
    );
    return prisma.$transaction(operations);
  }

  async delete(key: string) {
    return prisma.systemSetting.delete({ where: { key } });
  }
}
