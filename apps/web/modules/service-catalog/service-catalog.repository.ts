import { prisma } from "@/lib/prisma"

export class ServiceCatalogRepository {
  findActive() {
    return prisma.treatment.findMany({
      where: {
        isActive: true,
        specialty: {
          isActive: true,
          dentists: { some: { user: { isActive: true, role: "DENTIST" } } },
        },
      },
      select: {
        id: true,
        name: true,
        category: true,
        specialty: { select: { name: true } },
        description: true,
        price: true,
        durationMinutes: true,
      },
      orderBy: [{ category: "asc" }, { name: "asc" }, { id: "asc" }],
    })
  }
}
