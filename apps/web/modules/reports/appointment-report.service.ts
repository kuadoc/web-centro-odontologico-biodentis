import { AppointmentAnalyticsQuerySchema, type AppointmentAnalytics, type AppointmentAnalyticsQuery } from "@biodentis/shared-validators";
import { Role } from "@biodentis/shared-types";
import { AuthorizationError, ValidationError } from "@/lib/errors";
import { appointmentInstant, clinicDateKey } from "@/lib/clinic-calendar";
import { canSendEmail } from "@/lib/email/email-policy";
import { AppointmentReportRepository } from "./appointment-report.repository";

const dayMs = 86_400_000;
const day = (value: Date) => value.toISOString().slice(0, 10);
const shift = (date: string, offset: number) => day(new Date(new Date(date).getTime() + offset * dayMs));
function range(filter: AppointmentAnalyticsQuery, now: Date) {
  const anchor = filter.date ?? clinicDateKey(now);
  const date = new Date(anchor);
  let start = anchor; let end = anchor;
  if (filter.period === "week") { start = shift(anchor, -((date.getUTCDay() + 6) % 7)); end = shift(start, 6); }
  if (filter.period === "month") { start = `${anchor.slice(0, 7)}-01`; end = day(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0))); }
  if (filter.period === "year") { start = `${anchor.slice(0, 4)}-01-01`; end = `${anchor.slice(0, 4)}-12-31`; }
  if (filter.period === "custom") { start = filter.start!; end = filter.end!; }
  const days = (new Date(end).getTime() - new Date(start).getTime()) / dayMs + 1;
  if (days < 1 || days > 366) throw new ValidationError("El período debe comprender entre 1 y 366 días");
  return { start, end, days };
}
type StoredAppointment = Awaited<ReturnType<AppointmentReportRepository["data"]>>["appointments"][number];
function reminder(appointment: StoredAppointment, now: Date): AppointmentAnalytics["appointments"][number]["reminder"] {
  const start = appointmentInstant(appointment.date, appointment.startTime);
  const dueAt = new Date(start.getTime() - dayMs).toISOString();
  const job = appointment.emailOutbox.find((entry) => entry.kind === `REMINDER:${day(appointment.date)}:${appointment.startTime}`);
  const base = { dueAt, attempts: job?.attempts ?? 0, nextAttemptAt: null as string | null, acceptedAt: null as string | null };
  if (job?.outcome === "SMTP_ACCEPTED") return { ...base, state: "ACCEPTED", label: "Aceptado por SMTP", acceptedAt: job.deliveredAt?.toISOString() ?? null };
  if (appointment.status !== "CONFIRMED") return { ...base, dueAt: null, state: "NOT_APPLICABLE", label: appointment.status === "PENDING" ? "Requiere confirmación" : "No corresponde" };
  if (job?.outcome === "SUPPRESSED" || appointment.patient.email.endsWith("@patients.invalid") || !canSendEmail(appointment.patient.email)) return { ...base, state: "SUPPRESSED", label: "Sin correo habilitado" };
  if (start <= now) return { ...base, state: "EXPIRED", label: "Cita pasada sin envío registrado" };
  if (job?.attempts && job.attempts >= 10) return { ...base, state: "FAILED", label: "Reintentos agotados" };
  if (job?.attempts) return { ...base, state: "RETRY", label: "En reintento", nextAttemptAt: job.availableAt.toISOString() };
  if (new Date(dueAt) <= now) return { ...base, state: "LATE", label: "Pendiente · plazo alcanzado" };
  return { ...base, state: job ? "QUEUED" : "SCHEDULED", label: job ? "En cola para 24 h antes" : "Previsto · aún sin encolar" };
}

export class AppointmentReportService {
  constructor(private readonly repository = new AppointmentReportRepository()) {}
  async report(input: unknown, actor: { id: string; role: Role }, now = new Date(), allRows = false): Promise<AppointmentAnalytics> {
    if (![Role.ADMIN, Role.PATIENT].includes(actor.role)) throw new AuthorizationError();
    const filter = AppointmentAnalyticsQuerySchema.parse(input);
    const { start, end, days } = range(filter, now);
    const time = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
    const source = await this.repository.data(start, end, clinicDateKey(now), time, actor.role === Role.PATIENT ? actor.id : undefined, filter.dentistId, actor.role === Role.ADMIN);
    const granularity = days <= 31 ? "day" : days <= 93 ? "week" : "month";
    const bucket = (date: string) => granularity === "month" ? date.slice(0, 7) : granularity === "week" ? shift(date, -((new Date(date).getUTCDay() + 6) % 7)) : date;
    const timeline = new Map<string, AppointmentAnalytics["timeline"][number]>();
    for (let date = start; date <= end; date = shift(date, 1)) { const key = bucket(date); if (!timeline.has(key)) timeline.set(key, { date: key, total: 0, completed: 0, cancelled: 0, noShow: 0 }); }
    const completed = source.appointments.filter((entry) => entry.status === "COMPLETED" && appointmentInstant(entry.date, entry.startTime) <= now);
    for (const entry of source.appointments) {
      const point = timeline.get(bucket(day(entry.date)))!; point.total++;
      if (entry.status === "COMPLETED" && appointmentInstant(entry.date, entry.startTime) <= now) point.completed++;
      if (entry.status === "CANCELLED") point.cancelled++;
      if (entry.status === "NO_SHOW") point.noShow++;
    }
    const rank = (key: (entry: StoredAppointment) => { id: string; name: string }) => {
      const groups = new Map<string, { id: string; name: string; completed: number; patients: Set<string> }>();
      for (const entry of completed) { const group = key(entry); const item = groups.get(group.id) ?? { ...group, completed: 0, patients: new Set<string>() }; item.completed++; item.patients.add(entry.patientId); groups.set(group.id, item); }
      return [...groups.values()].map((entry) => ({ ...entry, patients: entry.patients.size })).sort((a, b) => b.completed - a.completed || b.patients - a.patients || a.name.localeCompare(b.name));
    };
    const rows = source.appointments.map((entry) => ({
      id: entry.id, patientId: entry.patientId, patient: `${entry.patient.firstName} ${entry.patient.lastName}`, dentistId: entry.dentistId, dentist: `${entry.dentist.user.firstName} ${entry.dentist.user.lastName}`,
      service: entry.treatment?.name ?? "Sin servicio registrado", specialty: entry.treatment?.specialty?.name ?? entry.treatment?.category ?? "Sin especialidad registrada",
      date: day(entry.date), startTime: entry.startTime, endTime: entry.endTime, status: entry.status, reminder: reminder(entry, now),
    }));
    const upcoming = rows.filter((entry) => ["PENDING", "CONFIRMED"].includes(entry.status) && new Date(`${entry.date}T${entry.startTime}:00-05:00`) > now);
    const count = (status: string) => rows.filter((entry) => entry.status === status).length;
    const slice = <T,>(items: T[]) => allRows ? items : items.slice((filter.page - 1) * filter.pageSize, filter.page * filter.pageSize);
    const outcomes = (states: string[]) => rows.filter((entry) => states.includes(entry.reminder.state)).length;
    return {
      start, end, generatedAt: now.toISOString(), granularity,
      summary: { total: rows.length, completed: completed.length, scheduled: upcoming.length, pending: count("PENDING"), confirmed: count("CONFIRMED"), cancelled: count("CANCELLED"), noShow: count("NO_SHOW"), patients: new Set(completed.map((entry) => entry.patientId)).size, completedAllTime: source.completedAllTime, attendanceRate: completed.length + count("NO_SHOW") ? Math.round(completed.length / (completed.length + count("NO_SHOW")) * 1000) / 10 : 0 },
      timeline: [...timeline.values()],
      dentists: rank((entry) => ({ id: entry.dentistId, name: `${entry.dentist.user.firstName} ${entry.dentist.user.lastName}` })),
      specialties: rank((entry) => ({ id: entry.treatment?.specialty?.id ?? entry.treatment?.category ?? "unknown", name: entry.treatment?.specialty?.name ?? entry.treatment?.category ?? "Sin especialidad registrada" })),
      services: rank((entry) => ({ id: entry.treatment?.id ?? "unknown", name: entry.treatment?.name ?? "Sin servicio registrado" })),
      dentistOptions: source.dentistOptions.map((entry) => ({ id: entry.id, name: `${entry.user.firstName} ${entry.user.lastName}` })),
      appointments: slice(rows), upcoming: slice(upcoming), total: rows.length, upcomingTotal: upcoming.length, page: filter.page, pageSize: filter.pageSize,
      reminderSummary: { scheduled: outcomes(["SCHEDULED"]), queued: outcomes(["QUEUED"]), accepted: outcomes(["ACCEPTED"]), failed: outcomes(["FAILED", "RETRY"]), suppressed: outcomes(["SUPPRESSED"]), late: outcomes(["LATE"]) },
      worker: source.worker ? { startedAt: source.worker.startedAt.toISOString(), finishedAt: source.worker.finishedAt?.toISOString() ?? null, success: source.worker.success, processed: source.worker.processed, failed: source.worker.failed } : null,
    };
  }
}
