import assert from "node:assert/strict";
import { randomUUID, randomInt } from "node:crypto";
import { test } from "node:test";
import bcrypt from "bcrypt";
import { NextRequest } from "next/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const target = new URL(process.env.DATABASE_URL ?? "http://invalid");
if (!["127.0.0.1", "localhost"].includes(target.hostname) || target.port !== "55439" || target.pathname !== "/biodentis_test_final") {
  throw new Error("Esta prueba solo admite la BD desechable biodentis_test_final en localhost:55439.");
}
process.env.JWT_ACCESS_SECRET = "local-integration-access-only";
process.env.JWT_REFRESH_SECRET = "local-integration-refresh-only";
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Configuración de pruebas antes de cargar servicios.
const { prisma } = require("@/lib/prisma") as typeof import("@/lib/prisma");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { seedLocal, seedId, buildLocalAppointments } = require("../../prisma/seed-local") as typeof import("../../prisma/seed-local");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { AppointmentRepository } = require("@/modules/appointments/appointment.repository") as typeof import("@/modules/appointments/appointment.repository");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { CancellationService } = require("@/modules/appointments/cancellation.service") as typeof import("@/modules/appointments/cancellation.service");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { EmailOutboxRepository } = require("@/modules/appointments/email-outbox.repository") as typeof import("@/modules/appointments/email-outbox.repository");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { LoginThrottleRepository } = require("@/modules/auth/login-throttle.repository") as typeof import("@/modules/auth/login-throttle.repository");

function request(path: string, data: unknown, cookie?: string) {
  return new NextRequest(`http://localhost${path}`, { method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-for": "127.0.0.20", ...(cookie ? { cookie } : {}) }, body: JSON.stringify(data) });
}

test("PostgreSQL local: seed, login real, restricciones, concurrencia y atomicidad", async (context) => {
  const password = "LocalIntegration2026!";
  const hash = await bcrypt.hash(password, 12);
  const now = new Date();
  try {
    // Exclusivamente en la BD desechable verificada arriba: limpiar ejecuciones previas.
    await prisma.emailOutbox.deleteMany();
    await prisma.appointmentCancellation.deleteMany();
    await prisma.clinicalRecord.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.appointment.deleteMany();
    await prisma.scheduleException.deleteMany();
    await prisma.authThrottle.deleteMany();
    const first = await seedLocal(prisma, hash, now);
    assert.equal(first.version, 3);
    assert.equal(first.appointments, 27);
    assert.equal(await prisma.clinicalRecord.count(), 6);
    const patientCodes = await prisma.user.findMany({ where: { id: { in: Array.from({ length: 12 }, (_, index) => seedId(`user:${index === 0 ? "paciente@biodentis.com" : `paciente${index + 1}@example.test`}`)) } }, orderBy: { id: "asc" }, select: { id: true, patientCode: true, dni: true, phone: true } });
    assert.equal(patientCodes.length, 12);
    for (const patient of patientCodes) {
      assert.match(patient.patientCode!, /^#PAC-\d+$/);
      assert.match(patient.dni!, /^\d{8}$/);
      assert.match(patient.phone!, /^\d{9}$/);
    }
    assert.equal(new Set(patientCodes.map((user) => user.patientCode)).size, 12);
    const nextDay = new Date(now.getTime() + 86400000);
    await seedLocal(prisma, hash, nextDay);
    await seedLocal(prisma, hash, now);
    assert.deepEqual(await prisma.user.findMany({ where: { id: { in: patientCodes.map((user) => user.id) } }, orderBy: { id: "asc" }, select: { id: true, patientCode: true, dni: true, phone: true } }), patientCodes, "Repetir el seed conserva códigos y documentos");
    assert.equal(await prisma.emailOutbox.count({ where: { appointmentId: { in: buildLocalAppointments(now).map((item) => item.id) } } }), 0);
    assert.equal(await prisma.emailTemplate.count({ where: { key: { in: ["password_reset", "welcome", "appointment_confirmation", "appointment_registration", "appointment_reminder", "appointment_cancelled"] } } }), 6);
    assert.equal(await prisma.appointment.count(), 27, "repetir no duplica citas incluso al cambiar el día");
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "paciente@biodentis.com" } });
    const dentist = await prisma.dentist.findUniqueOrThrow({ where: { id: seedId("dentist:0") } });
    const doctor = await prisma.user.findUniqueOrThrow({ where: { id: dentist.userId } });
    const treatment = await prisma.treatment.findUniqueOrThrow({ where: { id: seedId("treatment:0") } });
    const date = new Date(now.toISOString().slice(0, 10));
    date.setUTCDate(date.getUTCDate() + 6);
    const base = { patientId: user.id, dentistId: dentist.id, treatmentId: treatment.id, date, startTime: "12:00", endTime: "12:30", status: "CONFIRMED" as const };
    await assert.rejects(prisma.appointment.create({ data: { ...base, startTime: "25:00" } }));
    await assert.rejects(prisma.treatment.update({ where: { id: treatment.id }, data: { price: -1 } }));
    await assert.rejects(prisma.inventoryItem.update({ where: { sku: "DEMO-GUANTES" }, data: { stock: -1 } }));
    await assert.rejects(prisma.user.create({ data: { email: `${randomUUID()}@example.test`, firstName: "Duplicado", lastName: "DNI", dni: user.dni, passwordHash: hash, role: "PATIENT" } }));
    const repository = new AppointmentRepository();
    const reservations = await Promise.allSettled([repository.create(base), repository.create({ ...base, startTime: "12:15", endTime: "12:45" })]);
    assert.equal(reservations.filter((item) => item.status === "fulfilled").length, 1);
    const booking = await prisma.appointment.findFirstOrThrow({ where: { dentistId: dentist.id, date } });
    assert.equal(await prisma.emailOutbox.count({ where: { appointmentId: booking.id, kind: "BOOKING" } }), 1);
    // También una escritura SQL/Prisma directa queda protegida contra solapamientos.
    await assert.rejects(prisma.appointment.create({ data: { ...base, startTime: "12:20", endTime: "12:50" } }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const auditModule = require("@/modules/audit/audit.service") as typeof import("@/modules/audit/audit.service");
    const audit = context.mock.method(auditModule.AuditService.prototype, "log", async () => { throw new Error("Fallo auditoría simulado"); });
    await assert.rejects(repository.completeWithRecord(booking.id, user.id, dentist.id, "Diagnóstico y tratamiento de prueba", doctor.id), /Fallo auditoría/);
    assert.equal((await prisma.appointment.findUniqueOrThrow({ where: { id: booking.id } })).status, "CONFIRMED");
    assert.equal(await prisma.clinicalRecord.count({ where: { appointmentId: booking.id } }), 0);
    audit.mock.restore();
    await repository.completeWithRecord(booking.id, user.id, dentist.id, "Diagnóstico y tratamiento de prueba", doctor.id);
    assert.equal((await prisma.appointment.findUniqueOrThrow({ where: { id: booking.id } })).status, "COMPLETED");
    assert.equal(await prisma.auditLog.count({ where: { resourceId: booking.id, action: "CREATE_CLINICAL_RECORD" } }), 1);
    await assert.rejects(prisma.clinicalRecord.update({ where: { appointmentId: booking.id }, data: { patientId: (await prisma.user.findUniqueOrThrow({ where: { email: "paciente2@example.test" } })).id } }));
    await assert.rejects(prisma.appointment.update({ where: { id: booking.id }, data: { status: "CANCELLED" } }));
    // Renombrar la especialidad mantiene su copia de compatibilidad.
    const specialty = await prisma.specialty.findUniqueOrThrow({ where: { name: "Odontología General" } });
    await prisma.specialty.update({ where: { id: specialty.id }, data: { name: "General local renombrada" } });
    assert.equal((await prisma.treatment.findUniqueOrThrow({ where: { id: treatment.id } })).category, "General local renombrada");
    await prisma.specialty.update({ where: { id: specialty.id }, data: { name: "Odontología General" } });
    // Dos trabajadores no reclaman el mismo mensaje.
    const claims = await Promise.all([new EmailOutboxRepository().claim(booking.id), new EmailOutboxRepository().claim(booking.id)]);
    assert.equal(claims.filter(Boolean).length, 1);
    const counters = await Promise.all(Array.from({ length: 12 }, () => new LoginThrottleRepository().increment("test-concurrent", 60000)));
    assert.equal(Math.max(...counters.map((item) => item.count)), 12);
    // Cancelación propia: horario libre y motivo persistido, sin aprobación de recepción.
    const own = await repository.create({ ...base, startTime: "14:00", endTime: "14:30" });
    await new CancellationService().cancelOwn(own.id, { reason: "Necesito cambiar esta cita por un compromiso personal." }, user.id);
    assert.equal((await prisma.appointment.findUniqueOrThrow({ where: { id: own.id } })).status, "CANCELLED");
    await repository.create({ ...base, startTime: "14:00", endTime: "14:30" });
    const pending = await repository.create({ ...base, startTime: "15:00", endTime: "15:30", status: "PENDING" });
    await repository.updateStatus(pending.id, "CONFIRMED");
    assert.equal(await prisma.emailOutbox.count({ where: { appointmentId: pending.id, kind: "CONFIRMATION" } }), 1);
    // HU-08/HU-09: bajas y excepciones cancelan pendientes y conservan confirmadas.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { UserService } = require("@/modules/users/user.service") as typeof import("@/modules/users/user.service");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ExceptionService } = require("@/modules/config/exception.service") as typeof import("@/modules/config/exception.service");
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@biodentis.com" } });
    await assert.rejects(new UserService().update(doctor.id, { isActive: false }, admin.id), /confirmadas/);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: doctor.id } })).isActive, true);
    const temporaryDoctor = await prisma.user.create({ data: { email: `auto-${randomUUID()}@example.test`, passwordHash: hash, firstName: "Doctor", lastName: "Temporal", role: "DENTIST", dentistProfile: { create: { specialty: "Prueba" } } }, include: { dentistProfile: true } });
    await prisma.availability.create({ data: { dentistId: temporaryDoctor.dentistProfile!.id, dayOfWeek: date.getUTCDay(), startTime: "08:00", endTime: "18:00" } });
    const toCancel = await repository.create({ ...base, dentistId: temporaryDoctor.dentistProfile!.id, startTime: "16:00", endTime: "16:30", status: "PENDING" });
    await new UserService().update(temporaryDoctor.id, { isActive: false }, admin.id);
    assert.equal((await prisma.appointment.findUniqueOrThrow({ where: { id: toCancel.id } })).status, "CANCELLED");
    assert.equal(await prisma.emailOutbox.count({ where: { appointmentId: toCancel.id, kind: "CANCELLATION" } }), 1);
    const exceptionDate = new Date(date.getTime() + 86400000);
    const affected = await repository.create({ ...base, date: exceptionDate, status: "PENDING" });
    const day = exceptionDate.toISOString().slice(0, 10);
    await new ExceptionService().create({ scope: "CLINIC", startDate: new Date(`${day}T00:00:00-05:00`).toISOString(), endDate: new Date(`${day}T23:59:59-05:00`).toISOString() }, admin.id);
    assert.equal((await prisma.appointment.findUniqueOrThrow({ where: { id: affected.id } })).status, "CANCELLED");
    await assert.rejects(repository.create({ ...base, date: exceptionDate }), /excepción/);
    // El flujo alternativo no permite suplantar al odontólogo ni usar citas no atendidas.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ClinicalRecordService } = require("@/modules/clinical-records/clinical-record.service") as typeof import("@/modules/clinical-records/clinical-record.service");
    await assert.rejects(new ClinicalRecordService().create({ patientId: user.id, appointmentId: affected.id, notes: "Nota inválida por estado" }, doctor.id), /atendida/);
    await assert.rejects(new ClinicalRecordService().create({ patientId: user.id, appointmentId: booking.id, notes: "Nota de otro odontólogo" }, temporaryDoctor.id), /odontólogo activo/);
    // Caso reportado: registro -> logout -> login; cinco fallos de otra cuenta misma IP.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const registration = require("@/app/api/auth/register/route") as typeof import("@/app/api/auth/register/route");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const login = require("@/app/api/auth/login/route") as typeof import("@/app/api/auth/login/route");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const logout = require("@/app/api/auth/logout/route") as typeof import("@/app/api/auth/logout/route");
    const email = `${randomUUID()}@example.test`;
    const created = await registration.POST(request("/api/auth/register", { email, password, firstName: "Nuevo", lastName: "Local", dni: String(randomInt(10000000, 99999999)) }));
    assert.equal(created.status, 201);
    const cookie = created.headers.get("set-cookie")!.split(";")[0]!;
    assert.equal((await logout.POST(request("/api/auth/logout", {}, cookie))).status, 200);
    for (let index = 0; index < 5; index++) await login.POST(request("/api/auth/login", { email: "wrong@example.test", password: "wrong-password" }));
    for (let index = 0; index < 3; index++) assert.equal((await login.POST(request("/api/auth/login", { email, password }))).status, 200);
    for (let index = 0; index < 5; index++) await login.POST(request("/api/auth/login", { email, password: "wrong-password" }));
    assert.equal((await login.POST(request("/api/auth/login", { email: email.toUpperCase(), password }))).status, 200);
    const legacyEmail = `LEGACY-${randomUUID()}@EXAMPLE.TEST`;
    await prisma.user.create({ data: { email: legacyEmail, passwordHash: hash, firstName: "Cuenta", lastName: "Anterior", role: "PATIENT" } });
    assert.equal((await login.POST(request("/api/auth/login", { email: legacyEmail.toLowerCase(), password }))).status, 200);
    const preflight = readFileSync(resolve("prisma/preflight-integrity.sql"), "utf8").split("\n").filter((line) => !line.trimStart().startsWith("--")).join("\n");
    for (const query of preflight.split(";").filter((statement) => statement.trim())) {
      const issues = await prisma.$queryRawUnsafe<unknown[]>(query);
      assert.deepEqual(issues, [], "El preflight de la copia local debe quedar sin incidencias");
    }
  } finally { await prisma.$disconnect(); }
});
