import { PrismaClient } from "@prisma/client";
import { ReportRepository, AppointmentReport } from "../domain/ReportRepository";

const prisma = new PrismaClient();

export class PrismaReportRepository implements ReportRepository {
  async getAppointmentReport(from: Date, to: Date, dentistId?: string): Promise<AppointmentReport> {
    const where: any = {
      date: { gte: from, lte: to },
    };
    if (dentistId) {
      where.dentistId = dentistId;
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        dentist: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    const byDentistMap = new Map<string, { dentistName: string; count: number }>();

    const report: AppointmentReport = {
      totalAppointments: appointments.length,
      completed: 0,
      cancelled: 0,
      noShow: 0,
      pending: 0,
      confirmed: 0,
      byDentist: [],
    };

    for (const apt of appointments) {
      switch (apt.status) {
        case "COMPLETED":
          report.completed++;
          break;
        case "CANCELLED":
          report.cancelled++;
          break;
        case "NO_SHOW":
          report.noShow++;
          break;
        case "PENDING":
          report.pending++;
          break;
        case "CONFIRMED":
          report.confirmed++;
          break;
      }

      const dentistKey = apt.dentistId;
      const existing = byDentistMap.get(dentistKey);
      if (existing) {
        existing.count++;
      } else {
        byDentistMap.set(dentistKey, {
          dentistName: `${apt.dentist.user.firstName} ${apt.dentist.user.lastName}`,
          count: 1,
        });
      }
    }

    report.byDentist = Array.from(byDentistMap.entries()).map(([dentistId, data]) => ({
      dentistId,
      ...data,
    }));

    return report;
  }
}
