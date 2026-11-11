import assert from "node:assert/strict";
import { test } from "node:test";
import bcrypt from "bcrypt";
import { ZodError } from "zod";
import { CreatePatientSchema, UpdatePatientSchema } from "@biodentis/shared-validators";

const unmocked = async () => { throw new Error("Acceso a BD sin simular"); };
const prisma = {
  user: { findUnique: unmocked, findFirst: unmocked, findMany: unmocked, count: unmocked, create: unmocked, update: unmocked },
  appointment: { findMany: unmocked, findUnique: unmocked },
};
(globalThis as unknown as { prisma: unknown }).prisma = prisma;
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Inyectar BD falsa antes de cargar servicios y repositorios.
const { PatientService } = require("@/modules/patients/patient.service") as typeof import("@/modules/patients/patient.service");
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Compartir la BD falsa.
const { PatientRepository } = require("@/modules/patients/patient.repository") as typeof import("@/modules/patients/patient.repository");
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Compartir la BD falsa.
const { AppointmentRepository } = require("@/modules/appointments/appointment.repository") as typeof import("@/modules/appointments/appointment.repository");
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Evitar persistencia real de auditoría.
const { AuditService } = require("@/modules/audit/audit.service") as typeof import("@/modules/audit/audit.service");

const patient = { id: "patient-id", email: "patient@example.test", firstName: "Ana", lastName: "Pérez", patientCode: "#PAC-0001", dni: "01234567" };
const registration = { email: patient.email, firstName: patient.firstName, lastName: patient.lastName, password: "test-password" };
const reason = "Actualización de datos del paciente";

test("DNI: conserva ceros iniciales y permite pacientes antiguos sin documento", () => {
  assert.equal(CreatePatientSchema.parse({ ...registration, dni: " 01234567 " }).dni, "01234567");
  assert.equal(CreatePatientSchema.parse(registration).dni, undefined);
  for (const dni of [null, "", "   "]) {
    assert.equal(CreatePatientSchema.parse({ ...registration, dni }).dni, null);
    assert.equal(UpdatePatientSchema.parse({ dni }).dni, null);
  }
  assert.equal(UpdatePatientSchema.parse({ firstName: "Ana" }).dni, undefined);
});

for (const dni of ["1234567", "123456789", "ABCDEFGH", "1234 678", 12345678]) {
  test(`DNI inválido ${JSON.stringify(dni)}: alta y edición rechazan antes de consultar BD`, async () => {
    await assert.rejects(new PatientService().create({ ...registration, dni }, "actor"), ZodError);
    await assert.rejects(new PatientService().update(patient.id, { dni, auditReason: reason }, "actor"), ZodError);
  });
}

test("alta de paciente: persiste y devuelve el DNI validado", async (context) => {
  context.mock.method(prisma.user, "findUnique", async () => null);
  context.mock.method(prisma.user, "findFirst", async () => null);
  context.mock.method(bcrypt, "hash", async () => "test-hash");
  context.mock.method(AuditService.prototype, "log", async () => ({}));
  const write = context.mock.method(prisma.user, "create", async () => patient);
  const result = await new PatientService().create({ ...registration, dni: patient.dni }, "actor");
  assert.equal(result.dni, patient.dni);
  const args = write.mock.calls[0]!.arguments[0] as { data: { dni: string; role: string }; select: { dni: boolean } };
  assert.equal(args.data.dni, "01234567");
  assert.equal(args.data.role, "PATIENT");
  assert.equal(args.select.dni, true);
});

test("edición de paciente: guarda, borra o conserva DNI según el campo enviado", async (context) => {
  context.mock.method(PatientRepository.prototype, "findById", async () => patient);
  const write = context.mock.method(prisma.user, "update", async () => patient);
  const audit = context.mock.method(AuditService.prototype, "log", async () => ({}));
  const service = new PatientService();
  for (const [data, expected] of [[{ dni: "01234567" }, "01234567"], [{ dni: "" }, null], [{ firstName: "Ana" }, undefined]] as const) {
    await service.update(patient.id, { ...data, auditReason: reason }, "actor");
    const args = write.mock.calls.at(-1)!.arguments[0] as { data: { dni?: string | null } };
    assert.equal(args.data.dni, expected);
  }
  assert.equal(audit.mock.callCount(), 3);
});

test("citas: listado y detalle seleccionan y devuelven el DNI del paciente", async (context) => {
  const result = { id: "appointment-id", patient: { dni: patient.dni } };
  const list = context.mock.method(prisma.appointment, "findMany", async () => [result]);
  const detail = context.mock.method(prisma.appointment, "findUnique", async () => result);
  const repository = new AppointmentRepository();
  assert.equal((await repository.findMany({}))[0]!.patient.dni, "01234567");
  assert.equal((await repository.findById(result.id))!.patient.dni, "01234567");
  for (const operation of [list, detail]) {
    const args = operation.mock.calls[0]!.arguments[0] as { include: { patient: { select: { dni: boolean; passwordHash?: boolean } } } };
    assert.equal(args.include.patient.select.dni, true);
    assert.equal(args.include.patient.select.passwordHash, undefined);
  }
});

test("directorio: consulta DNI manteniendo el alcance de pacientes autorizado", async (context) => {
  const list = context.mock.method(prisma.user, "findMany", async () => []);
  context.mock.method(prisma.user, "count", async () => 0);
  await new PatientRepository().findMany({ search: "01234567", attendedByDentistId: "dentist-id" });
  const args = list.mock.calls[0]!.arguments[0] as { where: { role: string; AND: unknown[] }; select: { dni: boolean } };
  assert.equal(args.select.dni, true);
  assert.equal(args.where.role, "PATIENT");
  assert.deepEqual(args.where.AND[0], { appointments: { some: { dentistId: "dentist-id" } } });
  assert.ok(JSON.stringify(args.where.AND).includes('"dni":{"contains":"01234567"}'));
});
