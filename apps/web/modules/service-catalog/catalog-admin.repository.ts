import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

const eligibleDentist = { user: { isActive: true, role: "DENTIST" as const } }
const dentistSelect = {
  id: true,
  user: { select: { firstName: true, lastName: true } },
}

export class CatalogAdminRepository {
  constructor(private readonly db: Prisma.TransactionClient = prisma) {}

  list() {
    return this.db.specialty.findMany({
      include: {
        dentists: {
          where: eligibleDentist,
          select: dentistSelect,
          orderBy: { user: { firstName: "asc" } },
        },
        treatments: { orderBy: { name: "asc" } },
      },
      orderBy: { name: "asc" },
    })
  }

  dentists() {
    return this.db.dentist.findMany({
      where: eligibleDentist,
      select: dentistSelect,
      orderBy: { user: { firstName: "asc" } },
    })
  }

  find(id: string) {
    return this.db.specialty.findUnique({ where: { id } })
  }

  duplicateName(name: string, id?: string) {
    return this.db.specialty.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        id: id ? { not: id } : undefined,
      },
    })
  }

  futureAppointments(specialtyId: string) {
    // Fecha y hora de la clínica (Lima), igual que la agenda visible.
    const now = new Date()
    const date = new Date(
      `${now.toLocaleDateString("en-CA", { timeZone: "America/Lima" })}T00:00:00Z`
    )
    const time = now.toLocaleTimeString("en-GB", {
      timeZone: "America/Lima",
      hour: "2-digit",
      minute: "2-digit",
    })
    return this.db.appointment.count({
      where: {
        treatment: { specialtyId },
        status: { in: ["PENDING", "CONFIRMED"] },
        OR: [{ date: { gt: date } }, { date, startTime: { gte: time } }],
      },
    })
  }

  saveSpecialty(data: { name: string; description: string }, id?: string) {
    return id
      ? this.db.specialty.update({ where: { id }, data })
      : this.db.specialty.create({ data })
  }

  state(id: string, isActive: boolean) {
    return this.db.specialty.update({ where: { id }, data: { isActive } })
  }

  assign(id: string, dentistIds: string[]) {
    return this.db.specialty.update({
      where: { id },
      data: { dentists: { set: dentistIds.map((id) => ({ id })) } },
    })
  }

  findService(id: string) {
    return this.db.treatment.findUnique({ where: { id } })
  }

  duplicateService(specialtyId: string, name: string, id?: string) {
    return this.db.treatment.findFirst({
      where: {
        specialtyId,
        name: { equals: name, mode: "insensitive" },
        id: id ? { not: id } : undefined,
      },
    })
  }

  saveService(
    data: {
      name: string
      durationMinutes: number
      price: number | null
      specialtyId: string
      category: string
    },
    id?: string
  ) {
    return id
      ? this.db.treatment.update({ where: { id }, data })
      : this.db.treatment.create({ data })
  }

  serviceState(id: string, isActive: boolean) {
    return this.db.treatment.update({ where: { id }, data: { isActive } })
  }

  bookableService(id: string, dentistId: string) {
    return this.db.treatment.findFirst({
      where: {
        id,
        isActive: true,
        specialty: {
          isActive: true,
          dentists: { some: { id: dentistId, ...eligibleDentist } },
        },
      },
    })
  }

  bookingCatalog() {
    return this.db.specialty.findMany({
      where: { isActive: true, dentists: { some: eligibleDentist } },
      select: {
        id: true,
        name: true,
        dentists: { where: eligibleDentist, select: dentistSelect },
        treatments: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            durationMinutes: true,
            price: true,
            isActive: true,
          },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    })
  }
}
