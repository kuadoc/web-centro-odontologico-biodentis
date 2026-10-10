import { DashboardRepository } from "./dashboard.repository";
import { SystemSettingService } from "@/modules/system-settings/system-setting.service";
import { NotFoundError, DomainError, AuthorizationError } from "@/lib/errors";
import { Role, type AppointmentStatus } from "@biodentis/shared-types";
import { DENTIST_VISIBLE_STATUSES } from "@biodentis/shared-validators";

/** HU-12: estados visibles segun rol (solo el odontologo esta restringido). */
function visibleStatusesFor(role?: Role): AppointmentStatus[] | undefined {
  return role === Role.DENTIST ? DENTIST_VISIBLE_STATUSES : undefined;
}

const dashboardRepository = new DashboardRepository();
const systemSettingService = new SystemSettingService();

/** Meta de ingresos configurable desde Configuracion del sistema. */
export const REVENUE_GOAL_KEY = "dashboard_daily_revenue_goal";
const DEFAULT_REVENUE_GOAL = 1800;

/** Rango [00:00, 23:59:59.999] del dia indicado, en hora local del servidor. */
function dayRange(dateStr?: string): { from: Date; to: Date } {
  const base = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();
  if (Number.isNaN(base.getTime())) throw new DomainError("Fecha inválida");
  const from = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const to = new Date(from);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

function shiftDays(range: { from: Date; to: Date }, days: number) {
  const from = new Date(range.from);
  const to = new Date(range.to);
  from.setDate(from.getDate() + days);
  to.setDate(to.getDate() + days);
  return { from, to };
}

function minutesBetween(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number) as [number, number];
  const [eh, em] = endTime.split(":").map(Number) as [number, number];
  return Math.max(0, eh * 60 + em - (sh * 60 + sm));
}

/** Variacion porcentual vs periodo anterior. null cuando no hay base de comparacion. */
function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function toNumber(value: { toString(): string } | null | undefined): number {
  return value ? Number(value.toString()) : 0;
}

type AgendaRow = Awaited<ReturnType<DashboardRepository["findAgenda"]>>["items"][number];

/** Forma plana que consume la tabla de agenda del dashboard. */
function mapAgendaRow(apt: AgendaRow) {
  return {
    id: apt.id,
    date: apt.date,
    startTime: apt.startTime,
    endTime: apt.endTime,
    durationMinutes: minutesBetween(apt.startTime, apt.endTime),
    status: apt.status,
    priority: apt.priority,
    waitingStatus: apt.waitingStatus,
    checkInAt: apt.checkInAt,
    calledAt: apt.calledAt,
    notes: apt.notes,
    sessionNumber: apt.sessionNumber,
    patient: {
      id: apt.patient.id,
      fullName: `${apt.patient.firstName} ${apt.patient.lastName}`,
      patientCode: apt.patient.patientCode,
      avatarUrl: apt.patient.avatarUrl,
    },
    dentist: {
      id: apt.dentist.id,
      fullName: `${apt.dentist.user.firstName} ${apt.dentist.user.lastName}`,
    },
    treatment: apt.treatment
      ? {
          id: apt.treatment.id,
          name: apt.treatment.name,
          category: apt.treatment.category,
          price: toNumber(apt.treatment.price),
        }
      : null,
    dentalUnit: apt.dentalUnit,
    plan: apt.treatmentPlan
      ? {
          id: apt.treatmentPlan.id,
          totalSessions: apt.treatmentPlan.totalSessions,
          completedSessions: apt.treatmentPlan.completedSessions,
        }
      : null,
  };
}

export class DashboardService {
  /**
   * Resumen del dia: KPIs, desglose de estados, tratamientos activos e insumos bajos.
   * `dentistId` acota el panel al odontologo que lo consulta.
   */
  async getOverview(options: { date?: string; dentistId?: string; role?: Role } = {}) {
    const visible = visibleStatusesFor(options.role);
    const today = dayRange(options.date);
    const yesterday = shiftDays(today, -1);

    const [
      statusCounts,
      prevStatusCounts,
      billable,
      prevBillable,
      activePlans,
      planCategories,
      lowStock,
      goalSetting,
    ] = await Promise.all([
      dashboardRepository.countByStatus(today.from, today.to, options.dentistId, visible),
      dashboardRepository.countByStatus(yesterday.from, yesterday.to, options.dentistId, visible),
      dashboardRepository.findBillableAppointments(today.from, today.to, options.dentistId, visible),
      dashboardRepository.findBillableAppointments(yesterday.from, yesterday.to, options.dentistId, visible),
      dashboardRepository.countActivePlans(options.dentistId),
      dashboardRepository.groupActivePlansByCategory(options.dentistId),
      dashboardRepository.findLowStockItems(),
      systemSettingService.getValue(REVENUE_GOAL_KEY),
    ]);

    const byStatus = (rows: typeof statusCounts) => {
      const map: Record<string, number> = {
        PENDING: 0,
        CONFIRMED: 0,
        COMPLETED: 0,
        CANCELLED: 0,
        NO_SHOW: 0,
      };
      for (const row of rows) map[row.status] = row._count._all;
      return map;
    };

    const counts = byStatus(statusCounts);
    const prevCounts = byStatus(prevStatusCounts);

    // "Citas hoy" excluye canceladas: son las que realmente ocupan agenda.
    const totalToday = counts.PENDING! + counts.CONFIRMED! + counts.COMPLETED! + counts.NO_SHOW!;
    const totalYesterday =
      prevCounts.PENDING! + prevCounts.CONFIRMED! + prevCounts.COMPLETED! + prevCounts.NO_SHOW!;

    const revenue = billable.reduce((sum, a) => sum + toNumber(a.treatment?.price), 0);
    const prevRevenue = prevBillable.reduce((sum, a) => sum + toNumber(a.treatment?.price), 0);
    const revenueGoal = goalSetting ? Number(goalSetting) : DEFAULT_REVENUE_GOAL;

    const attended = counts.COMPLETED!;
    const elapsedHours = this.elapsedClinicHours(options.date);

    return {
      date: today.from,
      appointments: {
        total: totalToday,
        confirmed: counts.CONFIRMED,
        pending: counts.PENDING,
        completed: counts.COMPLETED,
        cancelled: counts.CANCELLED,
        noShow: counts.NO_SHOW,
        changeVsYesterday: pctChange(totalToday, totalYesterday),
      },
      attendance: {
        attended,
        scheduled: totalToday,
        percent: totalToday > 0 ? Math.round((attended / totalToday) * 100) : 0,
        patientsPerHour: elapsedHours > 0 ? Math.round((attended / elapsedHours) * 10) / 10 : 0,
      },
      treatments: {
        active: activePlans,
        byCategory: planCategories,
      },
      revenue: {
        estimated: Math.round(revenue * 100) / 100,
        goal: revenueGoal,
        percentOfGoal: revenueGoal > 0 ? Math.round((revenue / revenueGoal) * 1000) / 10 : 0,
        changeVsYesterday: pctChange(revenue, prevRevenue),
      },
      inventoryAlerts: lowStock.map((item) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        stock: item.stock,
        minStock: item.minStock,
        unit: item.unit,
      })),
    };
  }

  /** Horas transcurridas de jornada (08:00–20:00). Para dias pasados cuenta la jornada completa. */
  private elapsedClinicHours(dateStr?: string): number {
    const OPEN = 8;
    const CLOSE = 20;
    const now = new Date();
    const isToday = !dateStr || dayRange(dateStr).from.toDateString() === now.toDateString();
    if (!isToday) return CLOSE - OPEN;
    const current = now.getHours() + now.getMinutes() / 60;
    return Math.min(Math.max(current - OPEN, 0), CLOSE - OPEN);
  }

  /** Agenda paginada del dia, con filtro por estado (las pestañas de la tabla). */
  async getAgenda(options: {
    date?: string;
    dentistId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
    role?: Role;
  } = {}) {
    const { from, to } = dayRange(options.date);
    const page = Math.max(1, options.page ?? 1);
    const pageSize = Math.min(Math.max(1, options.pageSize ?? 5), 50);

    const { items, total } = await dashboardRepository.findAgenda({
      from,
      to,
      dentistId: options.dentistId,
      status: options.status as AppointmentStatus | undefined,
      // HU-12: el odontologo nunca ve citas PENDING ni CANCELLED.
      statuses: visibleStatusesFor(options.role),
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      items: items.map(mapAgendaRow),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  /** Sala de espera con minutos de espera calculados al vuelo. */
  async getWaitingRoom(options: { date?: string; dentistId?: string; role?: Role } = {}) {
    const { from, to } = dayRange(options.date);
    const rows = await dashboardRepository.findWaitingRoom(from, to, options.dentistId, visibleStatusesFor(options.role));
    const now = Date.now();

    return rows.map((apt) => {
      const row = mapAgendaRow(apt);
      return {
        ...row,
        waitedMinutes: apt.checkInAt
          ? Math.max(0, Math.round((now - apt.checkInAt.getTime()) / 60000))
          : 0,
      };
    });
  }

  /**
   * Marca la llegada del paciente. Idempotente: no reinicia el contador de espera.
   * `restrictToDentistId` impide que un odontologo toque citas de otro.
   */
  async checkIn(
    appointmentId: string,
    priority?: "NORMAL" | "URGENT" | "EMERGENCY",
    restrictToDentistId?: string,
    role?: Role
  ) {
    const appointment = await dashboardRepository.findAppointmentById(appointmentId);
    if (!appointment) throw new NotFoundError("Cita no encontrada");
    if (restrictToDentistId && appointment.dentistId !== restrictToDentistId) {
      throw new AuthorizationError("Esta cita no pertenece a tu agenda");
    }
    const visible = visibleStatusesFor(role);
    if (visible && !visible.includes(appointment.status as AppointmentStatus)) {
      throw new AuthorizationError("Esta cita aun no esta confirmada por Recepcion");
    }
    if (appointment.status === "CANCELLED") {
      throw new DomainError("La cita está cancelada");
    }
    if (appointment.checkInAt) {
      return mapAgendaRow(appointment);
    }

    const waitingStatus = priority && priority !== "NORMAL" ? "TRIAGE" : "WAITING";
    const updated = await dashboardRepository.updateWaiting(appointmentId, {
      waitingStatus,
      checkInAt: new Date(),
    });
    return mapAgendaRow(updated);
  }

  /** Llama al siguiente paciente en espera y lo pasa al sillon. */
  async callNext(options: { date?: string; dentistId?: string; role?: Role } = {}) {
    const { from, to } = dayRange(options.date);
    const next = await dashboardRepository.findNextToCall(from, to, options.dentistId, visibleStatusesFor(options.role));
    if (!next) return null;

    const updated = await dashboardRepository.updateWaiting(next.id, {
      waitingStatus: "IN_CHAIR",
      calledAt: new Date(),
    });
    return mapAgendaRow(updated);
  }
}
