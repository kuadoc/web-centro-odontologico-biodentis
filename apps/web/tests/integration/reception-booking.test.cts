import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test, type TestContext } from "node:test";
import { NextRequest } from "next/server";
import { Role } from "@biodentis/shared-types";
import { AccessSessionRepository } from "@/modules/auth/access-session.repository";
import { AppointmentRepository } from "@/modules/appointments/appointment.repository";
import { EmailOutboxService } from "@/modules/appointments/email-outbox.service";
import { AvailabilityService } from "@/modules/availability/availability.service";
import { CatalogAdminService } from "@/modules/service-catalog/catalog-admin.service";
import { PatientService } from "@/modules/patients/patient.service";
import { UserService } from "@/modules/users/user.service";
import { ScheduleConflictError } from "@/lib/errors";

process.env.JWT_ACCESS_SECRET = "reception-booking-test-secret";
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Configurar JWT antes de cargar las rutas.
const { generateAccessToken } = require("@/lib/auth") as typeof import("@/lib/auth");
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Compartir el secreto del test.
const appointments = require("@/app/api/appointments/route") as typeof import("@/app/api/appointments/route");
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Compartir el secreto del test.
const patients = require("@/app/api/patients/route") as typeof import("@/app/api/patients/route");
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Compartir el secreto del test.
const users = require("@/app/api/users/route") as typeof import("@/app/api/users/route");

const actorId = randomUUID();
const patientId = randomUUID();
const payload = { patientId, dentistId: randomUUID(), treatmentId: randomUUID(), reason: "Consulta dental", hasPain: false, problemDuration: "Una semana", date: "2030-01-07", startTime: "09:00", endTime: "09:30" };

function session(context: TestContext, role: Role) {
  context.mock.method(AccessSessionRepository.prototype, "findByJti", async () => ({
    userId: actorId, revokedAt: null, expiresAt: new Date(Date.now() + 3600000),
    user: { id: actorId, role, isActive: true },
  }));
}
function request(path: string, body?: unknown) {
  return new NextRequest(`http://localhost/api/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${generateAccessToken(actorId, "session")}`, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
function booking(context: TestContext) {
  const notice = context.mock.method(EmailOutboxService.prototype, "tryDeliver", async () => true);
  context.mock.method(CatalogAdminService.prototype, "requireBookable", async () => ({}));
  context.mock.method(AvailabilityService.prototype, "getAvailableSlots", async () => [{ startTime: "09:00", endTime: "09:45" }]);
  context.mock.method(AppointmentRepository.prototype, "findConflicting", async () => null);
  const save = context.mock.method(AppointmentRepository.prototype, "create", async (data: unknown) => ({ id: randomUUID(), ...(data as Record<string, unknown>) }));
  return { save, notice };
}

for (const role of [Role.RECEPTIONIST, Role.PATIENT, Role.ADMIN]) {
  test(`crear cita como ${role}: el servidor fija paciente, estado y responsable`, async (context) => {
    session(context, role);
    const { save, notice } = booking(context);
    const response = await appointments.POST(request("appointments", { ...payload, status: role === Role.RECEPTIONIST ? "PENDING" : "CONFIRMED", actorRole: "RECEPTIONIST", actorId: patientId }));
    assert.equal(response.status, 201);
    const result = await response.json();
    assert.equal(result.patientId, role === Role.PATIENT ? actorId : patientId);
    assert.equal(result.status, role === Role.RECEPTIONIST ? "CONFIRMED" : "PENDING");
    assert.equal(result.endTime, "09:45");
    assert.equal(save.mock.calls[0]?.arguments[1], role === Role.RECEPTIONIST ? actorId : undefined);
    assert.equal(notice.mock.callCount(), 1);
    assert.equal(notice.mock.calls[0]?.arguments[0], result.id);
  });
}

test("Recepción no puede registrar una cita sin seleccionar paciente", async (context) => {
  session(context, Role.RECEPTIONIST);
  const { save, notice } = booking(context);
  const response = await appointments.POST(request("appointments", { ...payload, patientId: undefined }));
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /Selecciona el paciente/);
  assert.equal(save.mock.callCount(), 0);
  assert.equal(notice.mock.callCount(), 0);
});

test("una reserva rechazada por conflicto no envía correo", async (context) => {
  session(context, Role.RECEPTIONIST);
  const { save, notice } = booking(context);
  save.mock.mockImplementation(async () => { throw new ScheduleConflictError("Horario ocupado"); });
  const response = await appointments.POST(request("appointments", payload));
  assert.equal(response.status, 409);
  assert.equal(notice.mock.callCount(), 0);
});

test("el fallo del proveedor de correo conserva la cita ya guardada sin duplicarla", async (context) => {
  session(context, Role.RECEPTIONIST);
  const { save, notice } = booking(context);
  notice.mock.mockImplementation(async () => false);
  const response = await appointments.POST(request("appointments", payload));
  assert.equal(response.status, 201);
  assert.equal((await response.json()).status, "CONFIRMED");
  assert.equal(save.mock.callCount(), 1);
});

test("Recepción consulta y busca pacientes activos sin acceder a la administración de usuarios", async (context) => {
  session(context, Role.RECEPTIONIST);
  const read = context.mock.method(PatientService.prototype, "list", async () => ({ items: [{ id: patientId }], total: 1, page: 2, totalPages: 2, pageSize: 20 }));
  const adminRead = context.mock.method(UserService.prototype, "getAll", async () => []);
  const response = await patients.GET(request("patients?status=active&search=nuevo%40example.com&page=2&pageSize=20"));
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).items, [{ id: patientId }]);
  assert.deepEqual(read.mock.calls[0]?.arguments[0], { attendedByDentistId: undefined, status: "active", search: "nuevo@example.com", appointments: undefined, page: 2, pageSize: 20 });
  assert.equal((await users.GET(request("users?role=PATIENT"))).status, 403);
  assert.equal(adminRead.mock.callCount(), 0);
});

test("un paciente no puede consultar el selector de pacientes", async (context) => {
  session(context, Role.PATIENT);
  const read = context.mock.method(PatientService.prototype, "list", async () => ({}));
  assert.equal((await patients.GET(request("patients?status=active"))).status, 403);
  assert.equal(read.mock.callCount(), 0);
});
