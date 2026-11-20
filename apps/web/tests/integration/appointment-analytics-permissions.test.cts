import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { Role } from "@biodentis/shared-types";
import { AccessSessionRepository } from "@/modules/auth/access-session.repository";
import { AppointmentReportService } from "@/modules/reports/appointment-report.service";
import { AppointmentAnalyticsExportService } from "@/modules/reports/appointment-analytics-export.service";
import { ReminderService } from "@/modules/appointments/reminder.service";

process.env.JWT_ACCESS_SECRET = "analytics-permissions-test-secret";
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Configurar JWT antes de cargar auth.
const { generateAccessToken } = require("@/lib/auth") as typeof import("@/lib/auth");
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Rutas protegidas tras configuración JWT.
const report = require("@/app/api/reports/appointments/route") as typeof import("@/app/api/reports/appointments/route");
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Rutas protegidas tras configuración JWT.
const excel = require("@/app/api/reports/appointments/analytics-export/route") as typeof import("@/app/api/reports/appointments/analytics-export/route");
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Inspeccionar autenticación del cron sin ejecutar trabajos.
const cron = require("@/app/api/cron/email-outbox/route") as typeof import("@/app/api/cron/email-outbox/route");

for (const role of Object.values(Role)) {
  test(`analítica y Excel: autorización ${role} con identidad de sesión`, async (context) => {
    const id = randomUUID();
    context.mock.method(AccessSessionRepository.prototype, "findByJti", async () => ({ userId: id, revokedAt: null, expiresAt: new Date(Date.now() + 3600000), user: { id, role, isActive: true } }));
    const read = context.mock.method(AppointmentReportService.prototype, "report", async () => ({}));
    const exportFile = context.mock.method(AppointmentAnalyticsExportService.prototype, "exportXlsx", async () => ({ content: new Uint8Array([80, 75]), filename: "actividad.xlsx" }));
    const options = { headers: { Authorization: `Bearer ${generateAccessToken(id, "session")}` } };
    const allowed = role === Role.ADMIN || role === Role.PATIENT;
    const response = await report.GET(new NextRequest("http://localhost/api/reports/appointments?period=week&patientId=otro", options));
    assert.equal(response.status, allowed ? 200 : 403);
    assert.equal((await excel.GET(new NextRequest("http://localhost/api/reports/appointments/analytics-export?period=week", options))).status, allowed ? 200 : 403);
    assert.equal(read.mock.callCount(), allowed ? 1 : 0);
    assert.equal(exportFile.mock.callCount(), allowed ? 1 : 0);
    if (allowed) assert.deepEqual(read.mock.calls[0]!.arguments[1], { id, role });
  });
}
test("cron requiere secreto y no ejecuta con autenticación ausente o inválida", async (context) => {
  const previous = process.env.CRON_SECRET; process.env.CRON_SECRET = "test-cron-secret";
  context.after(() => { if (previous === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = previous; });
  const run = context.mock.method(ReminderService.prototype, "run", async () => ({ scheduled: 0, processed: 0, failed: 0 }));
  for (const value of [undefined, "Bearer incorrecto"]) assert.equal((await cron.GET(new NextRequest("http://localhost/api/cron/email-outbox", { headers: value ? { Authorization: value } : {} }))).status, 401);
  assert.equal(run.mock.callCount(), 0);
  const response = await cron.GET(new NextRequest("http://localhost/api/cron/email-outbox", { headers: { Authorization: "Bearer test-cron-secret" } }));
  assert.equal(response.status, 200); assert.equal(run.mock.callCount(), 1);
});
