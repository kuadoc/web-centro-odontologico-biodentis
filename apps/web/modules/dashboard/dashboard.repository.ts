import { prisma } from "@/lib/prisma";
import type { AppointmentStatus } from "@biodentis/shared-types";

/** Include compartido: todo lo que la agenda del dashboard necesita mostrar. */
const AGENDA_INCLUDE = {
  patient: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      patientCode: true,
      avatarUrl: true,
    },
  },
  dentist: {
    include: { user: { select: { firstName: true, lastName: true } } },
  },
  treatment: { select: { id: true, name: true, category: true, price: true } },
  dentalUnit: { select: { id: true, name: true, type: true } },
  treatmentPlan: { select: { id: true, totalSessions: true, completedSessions: true } },
} as const;

export interface AgendaFilter {
  from: Date;
  to: Date;
  dentistId?: string;
  status?: AppointmentStatus;
  skip?: number;
  take?: number;
}

export class DashboardRepository {
  async findAgenda(filter: AgendaFilter) {
    const where = {
      date: { gte: filter.from, lte: filter.to },
      ...(filter.dentistId ? { dentistId: filter.dentistId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: AGENDA_INCLUDE,
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        skip: filter.skip,
        take: filter.take,
      }),
      prisma.appointment.count({ where }),
    ]);

    return { items, total };
  }

  /** Conteo por estado en el rango, en una sola consulta agrupada. */
  async countByStatus(from: Date, to: Date, dentistId?: string) {
    return prisma.appointment.groupBy({
      by: ["status"],
      where: {
        date: { gte: from, lte: to },
        ...(dentistId ? { dentistId } : {}),
      },
      _count: { _all: true },
    });
  }

  /** Citas no canceladas del rango con el precio del tratamiento, para estimar ingresos. */
  async findBillableAppointments(from: Date, to: Date, dentistId?: string) {
    return prisma.appointment.findMany({
      where: {
        date: { gte: from, lte: to },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        ...(dentistId ? { dentistId } : {}),
      },
      select: { status: true, treatment: { select: { price: true } } },
    });
  }

  /** Pacientes presentes en la clinica hoy (llegaron y aun no terminan). */
  async findWaitingRoom(from: Date, to: Date, dentistId?: string) {
    return prisma.appointment.findMany({
      where: {
        date: { gte: from, lte: to },
        waitingStatus: { in: ["WAITING", "TRIAGE", "IN_CHAIR"] },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        ...(dentistId ? { dentistId } : {}),
      },
      include: AGENDA_INCLUDE,
      // Urgencias primero, luego por orden de llegada.
      orderBy: [{ priority: "desc" }, { checkInAt: "asc" }],
    });
  }

  /** Siguiente paciente a llamar: mayor prioridad y que lleve mas tiempo esperando. */
  async findNextToCall(from: Date, to: Date, dentistId?: string) {
    return prisma.appointment.findFirst({
      where: {
        date: { gte: from, lte: to },
        waitingStatus: { in: ["WAITING", "TRIAGE"] },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        ...(dentistId ? { dentistId } : {}),
      },
      include: AGENDA_INCLUDE,
      orderBy: [{ priority: "desc" }, { checkInAt: "asc" }],
    });
  }

  async countActivePlans(dentistId?: string) {
    return prisma.treatmentPlan.count({
      where: { status: "ACTIVE", ...(dentistId ? { dentistId } : {}) },
    });
  }

  /** Desglose de tratamientos activos por categoria (Ortodoncia 14, Implantes 11...). */
  async groupActivePlansByCategory(dentistId?: string) {
    const plans = await prisma.treatmentPlan.findMany({
      where: { status: "ACTIVE", ...(dentistId ? { dentistId } : {}) },
      select: { treatment: { select: { category: true } } },
    });

    const counts = new Map<string, number>();
    for (const plan of plans) {
      const category = plan.treatment.category;
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }

    return [...counts.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }

  async findLowStockItems() {
    const items = await prisma.inventoryItem.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    return items.filter((item) => item.stock <= item.minStock);
  }

  async updateWaiting(
    id: string,
    data: { waitingStatus?: "NOT_ARRIVED" | "WAITING" | "TRIAGE" | "IN_CHAIR" | "DONE"; checkInAt?: Date | null; calledAt?: Date | null }
  ) {
    return prisma.appointment.update({ where: { id }, data, include: AGENDA_INCLUDE });
  }

  async findAppointmentById(id: string) {
    return prisma.appointment.findUnique({ where: { id }, include: AGENDA_INCLUDE });
  }
}
