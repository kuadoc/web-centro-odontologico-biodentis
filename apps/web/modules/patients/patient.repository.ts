import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export interface PatientListFilter {
  search?: string;
  /** "active" | "inactive" | undefined = todos */
  status?: "active" | "inactive";
  /** "with" | "without" citas registradas */
  appointments?: "with" | "without";
  /**
   * Acota el directorio a los pacientes atendidos por este odontologo.
   * Lo fija el token, nunca el cliente.
   */
  attendedByDentistId?: string;
  skip?: number;
  take?: number;
}

const LIST_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  secondaryPhone: true,
  address: true,
  avatarUrl: true,
  patientCode: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export class PatientRepository {
  /**
   * WHERE del directorio: busqueda libre + estado + tenencia de citas,
   * y el acotamiento por odontologo cuando aplica.
   *
   * Se usa un AND explicito porque el filtro de rol y el de "con/sin citas"
   * apuntan a la misma relacion y un objeto plano los pisaria entre si.
   */
  private buildWhere(filter: PatientListFilter): Prisma.UserWhereInput {
    const search = filter.search?.trim();
    const and: Prisma.UserWhereInput[] = [];

    if (filter.attendedByDentistId) {
      // Solo pacientes con al menos una cita atendida por este odontologo.
      and.push({ appointments: { some: { dentistId: filter.attendedByDentistId } } });
    }

    if (filter.appointments === "with") {
      and.push({ appointments: { some: {} } });
    } else if (filter.appointments === "without") {
      // Para un odontologo "sin citas" es siempre vacio: su directorio se define
      // justamente por haber atendido. Prisma resuelve la contradiccion sola.
      and.push({ appointments: { none: {} } });
    }

    if (search) {
      and.push({
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search } },
          { patientCode: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    return {
      role: "PATIENT",
      ...(filter.status ? { isActive: filter.status === "active" } : {}),
      ...(and.length ? { AND: and } : {}),
    };
  }

  async findMany(filter: PatientListFilter) {
    const where = this.buildWhere(filter);

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { ...LIST_SELECT, _count: { select: { appointments: true } } },
        orderBy: { createdAt: "desc" },
        skip: filter.skip,
        take: filter.take,
      }),
      prisma.user.count({ where }),
    ]);

    return { items, total };
  }

  /** Todos los pacientes que cumplen el filtro, sin paginar. Para exportar a CSV. */
  async findAllForExport(filter: PatientListFilter) {
    return prisma.user.findMany({
      where: this.buildWhere(filter),
      select: { ...LIST_SELECT, _count: { select: { appointments: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  /** `attendedByDentistId` devuelve null si el paciente no es suyo: se traduce en 404. */
  async findById(id: string, attendedByDentistId?: string) {
    return prisma.user.findFirst({
      where: {
        id,
        role: "PATIENT",
        ...(attendedByDentistId
          ? { appointments: { some: { dentistId: attendedByDentistId } } }
          : {}),
      },
      select: LIST_SELECT,
    });
  }

  /** KPIs del encabezado: total, activos, inactivos y altas del mes en curso. */
  async getStats(monthStart: Date, attendedByDentistId?: string) {
    const scope: Prisma.UserWhereInput = {
      role: "PATIENT",
      ...(attendedByDentistId
        ? { appointments: { some: { dentistId: attendedByDentistId } } }
        : {}),
    };

    const [total, active, newThisMonth] = await Promise.all([
      prisma.user.count({ where: scope }),
      prisma.user.count({ where: { ...scope, isActive: true } }),
      prisma.user.count({ where: { ...scope, createdAt: { gte: monthStart } } }),
    ]);

    return { total, active, inactive: total - active, newThisMonth };
  }

  /** Conteo de citas por estado de un paciente, en una sola consulta agrupada. */
  async countAppointmentsByStatus(patientId: string, dentistId?: string) {
    return prisma.appointment.groupBy({
      by: ["status"],
      where: { patientId, ...(dentistId ? { dentistId } : {}) },
      _count: { _all: true },
    });
  }

  /** Historial de agenda (no clinico): fecha, odontologo, servicio y estado. */
  async findAppointmentHistory(patientId: string, dentistId?: string, take = 20) {
    return prisma.appointment.findMany({
      where: { patientId, ...(dentistId ? { dentistId } : {}) },
      select: {
        id: true,
        date: true,
        startTime: true,
        status: true,
        dentist: { select: { user: { select: { firstName: true, lastName: true } } } },
        treatment: { select: { name: true } },
      },
      orderBy: [{ date: "desc" }, { startTime: "desc" }],
      take,
    });
  }

  /** Ultima cita efectivamente atendida. */
  async findLastAttended(patientId: string, dentistId?: string) {
    return prisma.appointment.findFirst({
      where: { patientId, status: "COMPLETED", ...(dentistId ? { dentistId } : {}) },
      select: { date: true },
      orderBy: { date: "desc" },
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({ where: { id }, data, select: LIST_SELECT });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email }, select: { id: true } });
  }
}
