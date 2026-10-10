import { prisma } from "@/lib/prisma";
import type { z } from "zod";
import type { ExceptionScopeSchema, ExceptionStatusSchema } from "@biodentis/shared-validators";

type ExceptionScope = z.infer<typeof ExceptionScopeSchema>;
type ExceptionStatus = z.infer<typeof ExceptionStatusSchema>;

export class ExceptionRepository {
  async list(filters: {
    dentistId?: string;
    dentalUnitId?: string;
    scope?: ExceptionScope;
    status?: ExceptionStatus;
    from?: Date;
    to?: Date;
  }) {
    return prisma.scheduleException.findMany({
      where: {
        dentistId: filters.dentistId,
        dentalUnitId: filters.dentalUnitId,
        scope: filters.scope,
        status: filters.status,
        // Solapamiento con el rango [from, to]
        ...(filters.from ? { endDate: { gte: filters.from } } : {}),
        ...(filters.to ? { startDate: { lte: filters.to } } : {}),
      },
      orderBy: { startDate: "asc" },
    });
  }

  /** Excepción no cancelada del mismo objetivo (odontólogo, unidad o clínica) que se solape con el rango. */
  async findOverlapping(
    target: { scope: ExceptionScope; dentistId?: string; dentalUnitId?: string },
    startDate: Date,
    endDate: Date
  ) {
    return prisma.scheduleException.findFirst({
      where: {
        scope: target.scope,
        ...(target.scope === "DENTIST" ? { dentistId: target.dentistId } : {}),
        ...(target.scope === "UNIT" ? { dentalUnitId: target.dentalUnitId } : {}),
        status: { not: "CANCELLED" },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });
  }

  async dentistExists(dentistId: string) {
    return (await prisma.dentist.count({ where: { id: dentistId } })) > 0;
  }

  async dentalUnitExists(dentalUnitId: string) {
    return (await prisma.dentalUnit.count({ where: { id: dentalUnitId } })) > 0;
  }

  async create(data: {
    scope: ExceptionScope;
    dentistId?: string;
    dentalUnitId?: string;
    startDate: Date;
    endDate: Date;
    reason?: string;
  }) {
    return prisma.scheduleException.create({ data: { ...data, status: "CONFIRMED" } });
  }
}
