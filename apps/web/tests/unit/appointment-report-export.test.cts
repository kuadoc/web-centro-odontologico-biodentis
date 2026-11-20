import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import ExcelJS from "exceljs";
import { NextRequest } from "next/server";
import { Role } from "@biodentis/shared-types";
import { AppointmentReportExportService } from "@/modules/appointments/appointment-report-export.service";
import { CancellationRepository } from "@/modules/appointments/cancellation.repository";
import { ReassignmentRepository } from "@/modules/appointments/reassignment.repository";
import { AuditService } from "@/modules/audit/audit.service";
import { AccessSessionRepository } from "@/modules/auth/access-session.repository";

process.env.JWT_ACCESS_SECRET = "appointment-export-test-secret";
// eslint-disable-next-line @typescript-eslint/no-require-imports -- JWT configurado antes de cargar auth.
const { generateAccessToken } = require("@/lib/auth") as typeof import("@/lib/auth");
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Cargar endpoint después de configurar JWT.
const { GET } = require("@/app/api/reports/appointments/export/route") as typeof import("@/app/api/reports/appointments/export/route");

test("Excel real: todas las filas filtradas, Lima, motivos como texto y auditoría", async (context) => {
  const actorId = randomUUID();
  const requestedBy = { id: randomUUID(), name: "Recepción", role: Role.RECEPTIONIST };
  const person = { id: randomUUID(), name: "Paciente Ñandú" };
  const snapshot = { appointmentId: randomUUID(), patient: person, dentist: { id: randomUUID(), name: "Dra. María" }, date: "2026-11-19", startTime: "09:00", endTime: "09:30", requestedBy };
  const createdAt = new Date("2026-11-19T03:00:00Z");
  const cancellations = context.mock.method(CancellationRepository.prototype, "report", async (page: number, pageSize?: number, state?: string) => {
    assert.equal(page, 1);
    assert.equal(pageSize, undefined);
    assert.equal(state, "REQUESTED");
    return { items: Array.from({ length: 127 }, () => ({ id: randomUUID(), snapshot, originalStatus: "CONFIRMED", appointment: { status: "CONFIRMED" }, state: "REQUESTED", requestReason: '=HYPERLINK("https://example.test")', reviewReason: null, reviewerSnapshot: null, createdAt, reviewedAt: null })), total: 127 };
  });
  const reassignments = context.mock.method(ReassignmentRepository.prototype, "report", async (_page: number, pageSize?: number) => {
    assert.equal(pageSize, undefined);
    return { items: [{ id: randomUUID(), createdAt, details: JSON.stringify({ ...snapshot, previousDentist: snapshot.dentist, newDentist: { id: randomUUID(), name: "Dr. Nuevo" }, actor: requestedBy, status: "CONFIRMED", reason: "Reasignación de prueba por disponibilidad." }) }], total: 1 };
  });
  const audit = context.mock.method(AuditService.prototype, "log", async () => ({}));
  const file = await new AppointmentReportExportService().exportXlsx({ state: "REQUESTED" }, actorId);
  assert.match(file.filename, /^reporte-citas-\d{4}-\d{2}-\d{2}\.xlsx$/);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(file.content.buffer as ArrayBuffer);
  assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), ["Resumen", "Cancelaciones", "Reasignaciones"]);
  const sheet = workbook.getWorksheet("Cancelaciones")!;
  assert.equal(sheet.rowCount, 128);
  assert.equal(sheet.getCell("C2").value, person.name);
  assert.equal(sheet.getCell("E2").value, "2026-11-19");
  assert.match(String(sheet.getCell("K2").value), /18\/11\/2026.*22:00/);
  assert.equal(sheet.getCell("N2").type, ExcelJS.ValueType.String);
  assert.equal(sheet.getCell("N2").value, '=HYPERLINK("https://example.test")');
  assert.equal(workbook.getWorksheet("Reasignaciones")!.rowCount, 2);
  assert.equal(audit.mock.calls[0]!.arguments[0], actorId);
  assert.equal(audit.mock.calls[0]!.arguments[1], "EXPORT_APPOINTMENT_REPORT");
  await assert.rejects(new AppointmentReportExportService().exportXlsx({ state: "INVALID" }, actorId));
  assert.equal(cancellations.mock.callCount(), 1);
  assert.equal(reassignments.mock.callCount(), 1);
});

for (const role of Object.values(Role)) {
  test(`Exportación: permisos de ${role} y cabeceras Excel`, async (context) => {
    const actorId = randomUUID();
    context.mock.method(AccessSessionRepository.prototype, "findByJti", async () => ({ userId: actorId, revokedAt: null, expiresAt: new Date(Date.now() + 3600000), user: { id: actorId, role, isActive: true } }));
    const exportFile = context.mock.method(AppointmentReportExportService.prototype, "exportXlsx", async () => ({ content: new Uint8Array([80, 75]), filename: "reporte-citas.xlsx" }));
    const response = await GET(new NextRequest("http://localhost/api/reports/appointments/export?state=APPROVED", { headers: { Authorization: `Bearer ${generateAccessToken(actorId, "session")}` } }));
    assert.equal(response.status, role === Role.ADMIN ? 200 : 403);
    assert.equal(exportFile.mock.callCount(), role === Role.ADMIN ? 1 : 0);
    assert.equal(response.headers.get("Cache-Control"), "private, no-store");
    if (role === Role.ADMIN) {
      assert.deepEqual(exportFile.mock.calls[0]!.arguments, [{ state: "APPROVED" }, actorId]);
      assert.match(response.headers.get("Content-Type")!, /spreadsheetml/);
      assert.match(response.headers.get("Content-Disposition")!, /attachment;.*\.xlsx/);
    }
  });
}

test("Exportación sin sesión no lee datos", async (context) => {
  const exportFile = context.mock.method(AppointmentReportExportService.prototype, "exportXlsx", async () => { throw new Error("No debe exportar"); });
  assert.equal((await GET(new NextRequest("http://localhost/api/reports/appointments/export"))).status, 401);
  assert.equal(exportFile.mock.callCount(), 0);
});
