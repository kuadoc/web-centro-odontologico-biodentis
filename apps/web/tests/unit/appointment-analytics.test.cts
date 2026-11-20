import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import ExcelJS from "exceljs";
import { Role } from "@biodentis/shared-types";
import { AppointmentReportRepository } from "@/modules/reports/appointment-report.repository";
import { AppointmentReportService } from "@/modules/reports/appointment-report.service";
import { AppointmentAnalyticsExportService } from "@/modules/reports/appointment-analytics-export.service";
import { AuditService } from "@/modules/audit/audit.service";
import { AuthorizationError, ValidationError } from "@/lib/errors";

const now = new Date("2026-11-19T17:00:00Z");
const patientId = randomUUID(); const dentistId = randomUUID(); const otherDentist = randomUUID();
function appointment(status: "COMPLETED" | "CONFIRMED" | "PENDING" | "NO_SHOW" | "CANCELLED", date: string, who = patientId, dentist = dentistId) {
  return { id: randomUUID(), patientId: who, dentistId: dentist, date: new Date(date), startTime: "10:00", endTime: "10:30", status,
    patient: { firstName: "Ana", lastName: "Prueba", email: "ana@example.test" },
    dentist: { user: { firstName: dentist === dentistId ? "María" : "Juan", lastName: "Dentista" } },
    treatment: { id: "service", name: "Limpieza", category: "Presentación antigua", specialty: { id: "specialty", name: "Prevención" } },
    emailOutbox: [] as { kind: string; attempts: number; deliveredAt: Date | null; availableAt: Date; outcome: string | null }[],
  };
}
function fixture() {
  const rows = [appointment("COMPLETED", "2026-11-17"), appointment("COMPLETED", "2026-11-18"), appointment("COMPLETED", "2026-11-18", randomUUID(), otherDentist), appointment("CONFIRMED", "2026-11-20"), appointment("PENDING", "2026-11-21"), appointment("NO_SHOW", "2026-11-19"), appointment("CANCELLED", "2026-11-18")];
  return { appointments: rows, completedAllTime: 40, dentistOptions: [{ id: dentistId, user: { firstName: "María", lastName: "Dentista" } }], worker: null };
}
test("períodos, totales, ranking por citas realizadas, especialidad real y cero en días vacíos", async (context) => {
  const source = fixture();
  const read = context.mock.method(AppointmentReportRepository.prototype, "data", async (start: string, end: string) => ({ ...source, appointments: source.appointments.filter((row) => row.date >= new Date(start) && row.date <= new Date(end)) }));
  const service = new AppointmentReportService();
  const report = await service.report({ period: "month" }, { id: randomUUID(), role: Role.ADMIN }, now);
  assert.deepEqual([report.start, report.end], ["2026-11-01", "2026-11-30"]);
  assert.equal(report.timeline.length, 30);
  assert.equal(report.timeline[0]!.total, 0);
  assert.equal(report.summary.total, 7); assert.equal(report.summary.completed, 3);
  assert.equal(report.summary.patients, 2); assert.equal(report.summary.scheduled, 2);
  assert.equal(report.summary.attendanceRate, 75); assert.equal(report.summary.completedAllTime, 40);
  assert.deepEqual(report.dentists.map((entry) => [entry.id, entry.completed, entry.patients]), [[dentistId, 2, 1], [otherDentist, 1, 1]]);
  assert.equal(report.specialties[0]!.name, "Prevención");
  assert.equal(report.services[0]!.completed, 3);
  assert.equal(report.upcoming[0]!.reminder.dueAt, "2026-11-19T15:00:00.000Z");
  assert.equal(report.upcoming[0]!.reminder.state, "LATE");
  assert.equal(report.upcoming[1]!.reminder.state, "NOT_APPLICABLE");
  const week = await service.report({ period: "week" }, { id: patientId, role: Role.PATIENT }, now);
  assert.deepEqual([week.start, week.end], ["2026-11-16", "2026-11-22"]);
  assert.equal(read.mock.calls.at(-1)!.arguments[4], patientId);
  const year = await service.report({ period: "year", date: "2024-02-29", dentistId }, { id: patientId, role: Role.ADMIN }, now);
  assert.equal(year.timeline.length, 12); assert.equal(year.end, "2024-12-31");
  assert.equal(read.mock.calls.at(-1)!.arguments[5], dentistId);
  const calls = read.mock.callCount();
  for (const filter of [{ period: "custom", start: "2026-11-20", end: "2026-11-19" }, { period: "custom", start: "2020-01-01", end: "2026-01-01" }]) await assert.rejects(service.report(filter, { id: patientId, role: Role.ADMIN }, now), ValidationError);
  await assert.rejects(service.report({}, { id: patientId, role: Role.DENTIST }, now), AuthorizationError);
  assert.equal(read.mock.callCount(), calls);
});
test("recordatorios: aceptación, supresión y reintentos son estados distintos", async (context) => {
  const source = fixture();
  const row = source.appointments[3]!;
  row.emailOutbox = [{ kind: "REMINDER:2026-11-20:10:00", attempts: 1, deliveredAt: new Date("2026-11-19T15:00:00Z"), availableAt: now, outcome: "SMTP_ACCEPTED" }];
  context.mock.method(AppointmentReportRepository.prototype, "data", async () => source);
  const service = new AppointmentReportService();
  const actor = { id: patientId, role: Role.ADMIN };
  assert.equal((await service.report({}, actor, now)).reminderSummary.accepted, 1);
  row.emailOutbox[0]!.outcome = "SUPPRESSED";
  assert.equal((await service.report({}, actor, now)).reminderSummary.suppressed, 1);
  row.emailOutbox[0]!.outcome = "RETRY"; row.emailOutbox[0]!.deliveredAt = null;
  assert.equal((await service.report({}, actor, now)).upcoming[0]!.reminder.state, "RETRY");
  row.emailOutbox[0]!.attempts = 10;
  assert.equal((await service.report({}, actor, now)).upcoming[0]!.reminder.state, "FAILED");
});
test("Excel incluye todas las filas, rankings completos y alcance propio del paciente", async (context) => {
  const source = fixture(); source.appointments = Array.from({ length: 127 }, () => appointment("COMPLETED", "2026-11-18"));
  const read = context.mock.method(AppointmentReportRepository.prototype, "data", async () => source);
  context.mock.method(AuditService.prototype, "log", async () => ({}));
  const file = await new AppointmentAnalyticsExportService().exportXlsx({ period: "year", date: "2026-11-19", page: 5 }, { id: patientId, role: Role.PATIENT });
  const book = new ExcelJS.Workbook(); await book.xlsx.load(file.content.buffer as ArrayBuffer);
  assert.equal(book.getWorksheet("Citas")!.rowCount, 128);
  assert.ok(book.getWorksheet("Odontólogos")); assert.ok(book.getWorksheet("Servicios"));
  assert.equal(book.getWorksheet("Última ejecución"), undefined);
  assert.equal(read.mock.calls[0]!.arguments[4], patientId);
});
