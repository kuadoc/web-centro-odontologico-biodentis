import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test, type TestContext } from "node:test";
import { Role } from "@biodentis/shared-types";
import { Prisma, type PrismaClient } from "@prisma/client";
import { ReassignmentRepository } from "@/modules/appointments/reassignment.repository";
import { ReassignmentService } from "@/modules/appointments/reassignment.service";
import { UserRepository } from "@/modules/users/user.repository";
import { UserService } from "@/modules/users/user.service";
import { AuthorizationError, DomainError, InfrastructureError, ScheduleConflictError } from "@/lib/errors";
import { AppointmentRepository } from "@/modules/appointments/appointment.repository";

const id = { appointment: randomUUID(), actor: randomUUID(), patient: randomUUID(), old: randomUUID(), target: randomUUID(), specialty: randomUUID() };
const input = { dentistId: id.target, reason: "El profesional dejará de atender en la clínica." };

function fixture(context: TestContext, role = Role.ADMIN, status = "CONFIRMED") {
  const actor = { id: id.actor, firstName: "Admin", lastName: "Test", role, isActive: true };
  const appointment = {
    id: id.appointment, patientId: id.patient, dentistId: id.old, status,
    date: new Date("2030-01-07"), startTime: "09:00", endTime: "10:00", clinicalRecord: null,
    patient: { firstName: "Paciente", lastName: "Test" },
    dentist: { user: { firstName: "Anterior", lastName: "Test" } },
    treatment: { specialtyId: id.specialty, category: "General" },
  };
  const dentist = {
    id: id.target, specialty: "General", user: { firstName: "Nuevo", lastName: "Test", isActive: true, role: "DENTIST" },
    specialties: [{ id: id.specialty }], availability: [{ dayOfWeek: 1, startTime: "08:00", endTime: "18:00" }],
  };
  const repository = new ReassignmentRepository();
  const audit: string[] = [];
  context.mock.method(ReassignmentRepository.prototype, "withTransaction", async (operation: (repo: ReassignmentRepository) => Promise<unknown>) => {
    const previous = appointment.dentistId;
    try { return await operation(repository); }
    catch (error) { appointment.dentistId = previous; throw error; }
  });
  context.mock.method(ReassignmentRepository.prototype, "findActor", async () => actor);
  context.mock.method(ReassignmentRepository.prototype, "findAppointment", async () => ({ ...appointment }));
  context.mock.method(ReassignmentRepository.prototype, "findDentist", async () => dentist);
  const exception = context.mock.method(ReassignmentRepository.prototype, "findException", async () => null);
  const conflict = context.mock.method(ReassignmentRepository.prototype, "findConflict", async () => null);
  const update = context.mock.method(ReassignmentRepository.prototype, "updateDentist", async (_id: string, target: string) => { appointment.dentistId = target; return { ...appointment }; });
  const record = context.mock.method(ReassignmentRepository.prototype, "record", async (_actor: string, _appointment: string, details: string) => { audit.push(details); });
  return { actor, appointment, dentist, exception, conflict, update, record, audit, service: new ReassignmentService(repository) };
}

for (const role of Object.values(Role)) {
  for (const status of ["PENDING", "CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELLED"]) {
    test(`reasignación: ${role} con cita ${status}`, async (context) => {
      const state = fixture(context, role, status);
      const permitted = (role === Role.ADMIN && status === "CONFIRMED") || (role === Role.RECEPTIONIST && status === "PENDING");
      if (!permitted) {
        await assert.rejects(state.service.reassign(id.appointment, input, id.actor), AuthorizationError);
        assert.equal(state.update.mock.callCount(), 0);
        assert.equal(state.record.mock.callCount(), 0);
        return;
      }
      const result = await state.service.reassign(id.appointment, input, id.actor);
      assert.equal(result.dentistId, id.target);
      assert.equal(result.status, status);
      assert.equal(result.startTime, "09:00");
      assert.equal(result.endTime, "10:00");
      assert.equal(result.date.toISOString().slice(0, 10), "2030-01-07");
      const details = JSON.parse(state.audit[0]!);
      assert.equal(details.previousDentist.id, id.old);
      assert.equal(details.newDentist.id, id.target);
      assert.equal(details.actor.id, id.actor);
      assert.equal(details.status, status);
      assert.equal(details.reason, input.reason);
    });
  }
}

test("rechaza el mismo odontólogo, cuentas inactivas, especialidades distintas y horarios sin cobertura", async (context) => {
  const state = fixture(context);
  await assert.rejects(state.service.reassign(id.appointment, { ...input, dentistId: id.old }, id.actor), DomainError);
  state.dentist.user.isActive = false;
  await assert.rejects(state.service.reassign(id.appointment, input, id.actor), DomainError);
  state.dentist.user.isActive = true;
  state.dentist.specialties = [];
  await assert.rejects(state.service.reassign(id.appointment, input, id.actor), DomainError);
  state.dentist.specialties = [{ id: id.specialty }];
  state.dentist.availability = [];
  await assert.rejects(state.service.reassign(id.appointment, input, id.actor), ScheduleConflictError);
  assert.equal(state.update.mock.callCount(), 0);
  assert.equal(state.record.mock.callCount(), 0);
});

test("excepciones y solapamientos bloquean antes de actualizar o registrar", async (context) => {
  const state = fixture(context);
  state.exception.mock.mockImplementation(async () => ({ id: "exception" }));
  await assert.rejects(state.service.reassign(id.appointment, input, id.actor), ScheduleConflictError);
  state.exception.mock.mockImplementation(async () => null);
  state.conflict.mock.mockImplementation(async () => ({ id: "occupied" }));
  await assert.rejects(state.service.reassign(id.appointment, input, id.actor), ScheduleConflictError);
  assert.equal(state.update.mock.callCount(), 0);
  assert.equal(state.record.mock.callCount(), 0);
});

test("si falla la auditoría se propaga el error y se revierte la reasignación", async (context) => {
  const state = fixture(context);
  const failure = new Error("Audit storage failed");
  state.record.mock.mockImplementation(async () => { throw failure; });
  await assert.rejects(state.service.reassign(id.appointment, input, id.actor), failure);
  assert.equal(state.appointment.dentistId, id.old);
});

test("el motivo es obligatorio y no se aceptan IDs inválidos", async (context) => {
  const state = fixture(context);
  for (const data of [{ ...input, reason: "" }, { ...input, reason: "    " }, { ...input, dentistId: "invalid" }]) {
    await assert.rejects(state.service.reassign(id.appointment, data, id.actor));
  }
  assert.equal(state.update.mock.callCount(), 0);
});

test("el reporte valida paginación y conserva los datos históricos del registro", async (context) => {
  const state = fixture(context);
  await state.service.reassign(id.appointment, input, id.actor);
  const report = context.mock.method(ReassignmentRepository.prototype, "report", async () => ({ items: [{ id: randomUUID(), details: state.audit[0], createdAt: new Date("2030-01-01T13:00:00Z") }], total: 1 }));
  const result = await state.service.report({ page: 1, pageSize: 25 });
  assert.equal(result.items[0]?.previousDentist.name, "Anterior Test");
  assert.equal(result.items[0]?.actor.role, Role.ADMIN);
  await assert.rejects(state.service.report({ page: -1 }));
  assert.equal(report.mock.callCount(), 1);
  report.mock.mockImplementation(async () => ({ items: [{ id: randomUUID(), details: "invalid-json", createdAt: new Date() }], total: 1 }));
  await assert.rejects(state.service.report({ page: 1 }), InfrastructureError);
});

function userFixture(context: TestContext) {
  const user = { id: randomUUID(), firstName: "Elías", lastName: "Castillo", role: Role.DENTIST, isActive: true };
  const repository = new UserRepository();
  const counts = { pending: 0, confirmed: 0 };
  context.mock.method(UserRepository.prototype, "withTransaction", async (operation: (repo: UserRepository) => Promise<unknown>) => operation(repository));
  context.mock.method(UserRepository.prototype, "findById", async () => ({ ...user }));
  context.mock.method(UserRepository.prototype, "countBlockingAppointments", async () => counts);
  const update = context.mock.method(UserRepository.prototype, "update", async (_id: string, data: { isActive: boolean }) => ({ ...user, isActive: data.isActive }));
  const audit = context.mock.method(UserRepository.prototype, "logStateChange", async () => ({}));
  return { user, counts, update, audit, service: new UserService(repository) };
}

for (const [pending, confirmed] of [[2, 0], [0, 3], [2, 3]]) {
  test(`baja bloqueada con ${pending} pendientes y ${confirmed} confirmadas`, async (context) => {
    const state = userFixture(context);
    Object.assign(state.counts, { pending, confirmed });
    await assert.rejects(state.service.update(state.user.id, { isActive: false }, id.actor), (error: unknown) => error instanceof DomainError && error.statusCode === 409 && error.message.includes(`${pending} citas pendientes`) && error.message.includes(`${confirmed} confirmadas`));
    assert.equal(state.update.mock.callCount(), 0, "No desactiva ni revoca sesiones");
    assert.equal(state.audit.mock.callCount(), 0);
  });
}

test("sin citas por atender permite desactivar y audita; reactivar no se bloquea por citas", async (context) => {
  const state = userFixture(context);
  assert.equal((await state.service.update(state.user.id, { isActive: false }, id.actor)).isActive, false);
  assert.equal(state.audit.mock.callCount(), 1);
  state.user.isActive = false;
  state.counts.confirmed = 3;
  assert.equal((await state.service.update(state.user.id, { isActive: true }, id.actor)).isActive, true);
  assert.equal(state.audit.mock.callCount(), 2);
});

test("reserva rechaza odontólogos desactivados dentro de la transacción", async () => {
  let creates = 0;
  const tx = {
    dentist: { findUnique: async () => ({ user: { role: "DENTIST", isActive: false } }) },
    appointment: { create: async () => { creates++; }, findFirst: async () => null },
  };
  const database = { $transaction: async (operation: (client: typeof tx) => Promise<unknown>) => operation(tx) };
  await assert.rejects(new AppointmentRepository(database as unknown as Pick<PrismaClient, "$transaction">).create({ patientId: id.patient, dentistId: id.target, date: new Date("2030-01-07"), startTime: "09:00", endTime: "10:00" }), DomainError);
  assert.equal(creates, 0);
});

test("la reasignación revalida el estado tras un conflicto concurrente", async (context) => {
  const state = fixture(context);
  // Usar el ejecutor real del repositorio para comprobar aislamiento y reintentos.
  context.mock.restoreAll();
  const tx = {} as Prisma.TransactionClient;
  let attempts = 0;
  const database = {
    $transaction: async (operation: (client: Prisma.TransactionClient) => Promise<unknown>, options: unknown) => {
      assert.deepEqual(options, { isolationLevel: "Serializable" });
      attempts++;
      const result = await operation(tx);
      if (attempts === 1) {
        state.appointment.status = "PENDING";
        throw new Prisma.PrismaClientKnownRequestError("Concurrent change", { code: "P2034", clientVersion: "test" });
      }
      return result;
    },
  };
  context.mock.method(ReassignmentRepository.prototype, "findActor", async () => state.actor);
  context.mock.method(ReassignmentRepository.prototype, "findAppointment", async () => ({ ...state.appointment }));
  context.mock.method(ReassignmentRepository.prototype, "findDentist", async () => state.dentist);
  context.mock.method(ReassignmentRepository.prototype, "findException", async () => null);
  context.mock.method(ReassignmentRepository.prototype, "findConflict", async () => null);
  const writes = context.mock.method(ReassignmentRepository.prototype, "updateDentist", async () => ({}));
  context.mock.method(ReassignmentRepository.prototype, "record", async () => ({}));
  const repository = new ReassignmentRepository(tx, database as unknown as Pick<PrismaClient, "$transaction">);
  await assert.rejects(new ReassignmentService(repository).reassign(id.appointment, input, id.actor), AuthorizationError);
  assert.equal(attempts, 2);
  assert.equal(writes.mock.callCount(), 1, "El reintento no escribe después de cambiar el estado");
});

test("desactivar reconsulta las citas si una reserva concurrente provoca un conflicto", async () => {
  let attempts = 0;
  let reads = 0;
  let writes = 0;
  const user = { id: randomUUID(), role: "DENTIST", isActive: true };
  const tx = {
    user: {
      findUnique: async () => ({ ...user }),
      update: async () => {
        writes++;
        throw new Prisma.PrismaClientKnownRequestError("Reserva concurrente", { code: "P2034", clientVersion: "test" });
      },
    },
    appointment: {
      groupBy: async () => { reads++; return reads === 1 ? [] : [{ status: "PENDING", _count: { _all: 1 } }]; },
    },
  };
  const database = {
    $transaction: async (operation: (client: typeof tx) => Promise<unknown>, options: unknown) => {
      assert.deepEqual(options, { isolationLevel: "Serializable" });
      attempts++;
      return operation(tx);
    },
  };
  const repository = new UserRepository(tx as unknown as Prisma.TransactionClient, database as unknown as Pick<PrismaClient, "$transaction">);
  await assert.rejects(new UserService(repository).update(user.id, { isActive: false }, id.actor), (error: unknown) => error instanceof DomainError && error.statusCode === 409);
  assert.equal(attempts, 2);
  assert.equal(reads, 2);
  assert.equal(writes, 1, "El reintento bloquea antes de desactivar o revocar sesiones");
  assert.equal(user.isActive, true);
});

test("la baja y su auditoría se ejecutan en la misma transacción y se revierten juntas", async () => {
  const user = { id: randomUUID(), role: "DENTIST", isActive: true };
  let revoked = false;
  const failure = new Error("No se pudo guardar auditoría");
  const tx = {
    user: {
      findUnique: async () => ({ ...user }),
      update: async ({ data }: { data: { isActive: boolean; refreshTokens: unknown } }) => {
        assert.ok(data.refreshTokens);
        user.isActive = data.isActive; revoked = true; return { ...user };
      },
    },
    appointment: { groupBy: async () => [] },
    auditLog: { create: async () => { throw failure; } },
  };
  const database = {
    $transaction: async (operation: (client: typeof tx) => Promise<unknown>) => {
      try { return await operation(tx); }
      catch (error) { user.isActive = true; revoked = false; throw error; }
    },
  };
  const repository = new UserRepository(tx as unknown as Prisma.TransactionClient, database as unknown as Pick<PrismaClient, "$transaction">);
  await assert.rejects(new UserService(repository).update(user.id, { isActive: false }, id.actor), failure);
  assert.equal(user.isActive, true);
  assert.equal(revoked, false);
});
