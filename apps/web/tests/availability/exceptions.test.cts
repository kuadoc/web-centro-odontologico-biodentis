import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test, type TestContext } from "node:test";
import { Prisma, type PrismaClient } from "@prisma/client";
import { ExceptionService } from "@/modules/config/exception.service";
import { ExceptionRepository } from "@/modules/config/exception.repository";
import { AvailabilityRepository } from "@/modules/availability/availability.repository";
import { AppointmentRepository } from "@/modules/appointments/appointment.repository";
import { ScheduleConflictError, DomainError } from "@/lib/errors";

const dentistId = randomUUID();
const dentalUnitId = randomUUID();
const actorId = randomUUID();
const input = {
  scope: "UNIT", dentalUnitId, reason: "Mantenimiento",
  startDate: "2026-11-15T05:00:00.000Z", endDate: "2026-11-16T04:59:59.999Z",
};
const appointment = (status = "PENDING", day = "2026-11-15", startTime = "14:00", endTime = "14:30") => ({
  id: randomUUID(), date: new Date(day), startTime, endTime, status,
  patient: { firstName: "Sami", lastName: "Castillo" },
  dentist: { user: { firstName: "Carlos", lastName: "Mendoza" } },
});

function fixture(context: TestContext) {
  const repository = new ExceptionRepository();
  context.mock.method(repository, "withTransaction", async (operation: (repo: ExceptionRepository) => Promise<unknown>) => operation(repository));
  context.mock.method(repository, "dentistExists", async () => true);
  context.mock.method(repository, "dentalUnitExists", async () => true);
  const overlap = context.mock.method(repository, "findOverlapping", async () => null);
  const appointments = context.mock.method(repository, "findAffectedAppointments", async () => []);
  const create = context.mock.method(repository, "create", async () => ({ id: "exception", status: "CONFIRMED" }));
  const audit = context.mock.method(repository, "record", async () => ({}));
  const cancel = context.mock.method(repository, "cancelPending", async () => {});
  return { service: new ExceptionService(repository), appointments, overlap, create, audit, cancel };
}

for (const status of ["CONFIRMED"]) {
  test(`no registra mantenimiento sobre una cita ${status}, ni altera citas o auditoría`, async (context) => {
    const state = fixture(context);
    state.appointments.mock.mockImplementation(async () => [appointment(status)]);
    await assert.rejects(state.service.create(input, actorId), (error: unknown) =>
      error instanceof ScheduleConflictError && error.message.includes("2026-11-15, 14:00") &&
      error.message.includes("Carlos Mendoza") && error.message.includes("Sami Castillo")
    );
    assert.equal(state.create.mock.callCount(), 0);
    assert.equal(state.audit.mock.callCount(), 0);
  });
}

test("el mensaje solo incluye citas dentro del período y horario afectados en Lima", async (context) => {
  const state = fixture(context);
  state.appointments.mock.mockImplementation(async () => [appointment("CONFIRMED"), appointment("PENDING", "2026-11-16")]);
  await assert.rejects(state.service.create(input, actorId), (error: unknown) =>
    error instanceof ScheduleConflictError && error.message.includes("1 cita confirmada") && !error.message.includes("2026-11-16,")
  );
});

test("una excepción parcial no bloquea por citas contiguas o fuera de sus horas", async (context) => {
  const state = fixture(context);
  state.appointments.mock.mockImplementation(async () => [appointment("PENDING", "2026-11-15", "13:00", "14:00"), appointment("PENDING", "2026-11-15", "15:01", "15:30")]);
  await state.service.create({ ...input, startDate: "2026-11-15T19:00:00Z", endDate: "2026-11-15T20:00:00Z" }, actorId);
  assert.equal(state.create.mock.callCount(), 1);
  assert.equal(state.audit.mock.callCount(), 1);
});

test("rechaza fechas invertidas y excepciones solapadas sin guardar", async (context) => {
  const state = fixture(context);
  await assert.rejects(state.service.create({ ...input, endDate: "2026-11-14T05:00:00Z" }, actorId), DomainError);
  state.overlap.mock.mockImplementation(async () => ({ id: "existing" }));
  await assert.rejects(state.service.create(input, actorId), ScheduleConflictError);
  assert.equal(state.create.mock.callCount(), 0);
});

for (const scope of ["CLINIC", "DENTIST", "UNIT"] as const) {
  test(`consulta solamente citas activas del alcance ${scope} en las fechas civiles seleccionadas`, async () => {
    const database = { appointment: { findMany: async (query: { where: Record<string, unknown> }) => {
      assert.deepEqual(query.where, {
        status: { in: ["PENDING", "CONFIRMED"] },
        date: { gte: new Date("2026-11-15"), lte: new Date("2026-11-15") },
        ...(scope === "DENTIST" ? { dentistId } : {}),
        ...(scope === "UNIT" ? { dentalUnitId } : {}),
      });
      return [];
    } } };
    await new ExceptionRepository(database as unknown as Prisma.TransactionClient)
      .findAffectedAppointments({ scope, dentistId, dentalUnitId }, new Date(input.startDate), new Date(input.endDate));
  });
}

test("disponibilidad consulta mantenimiento solo para la unidad asignada y respeta medianoche de Lima", async () => {
  const database = { scheduleException: { findFirst: async (query: { where: Record<string, unknown> }) => {
    assert.deepEqual(query.where, {
      OR: [{ scope: "DENTIST", dentistId }, { scope: "CLINIC" }, { scope: "UNIT", dentalUnitId }],
      status: { not: "CANCELLED" },
      startDate: { lt: new Date("2026-11-16T05:00:00Z") },
      endDate: { gte: new Date("2026-11-15T05:00:00Z") },
    });
    return null;
  } } };
  await new AvailabilityRepository(database as unknown as Prisma.TransactionClient).findException(dentistId, new Date("2026-11-15"), dentalUnitId);
});

test("al reservar o reprogramar se rechaza el bloqueo dentro de la transacción", async () => {
  let writes = 0;
  const tx = {
    dentist: { findUnique: async () => ({ user: { isActive: true, role: "DENTIST" } }) },
    scheduleException: { findFirst: async () => ({ id: "maintenance" }) },
    appointment: {
      findUnique: async () => ({ dentistId, dentalUnitId, status: "CONFIRMED", clinicalRecord: null, cancellations: [] }),
      create: async () => { writes++; }, update: async () => { writes++; },
    },
  };
  const database = { $transaction: async (operation: (db: typeof tx) => Promise<unknown>, options: unknown) => {
    assert.deepEqual(options, { isolationLevel: "Serializable" });
    return operation(tx);
  } };
  const repository = new AppointmentRepository(database as unknown as Pick<PrismaClient, "$transaction">);
  await assert.rejects(repository.create({ patientId: randomUUID(), dentistId, dentalUnitId, date: new Date("2026-11-15"), startTime: "14:00", endTime: "14:30" }), ScheduleConflictError);
  await assert.rejects(repository.reschedule(randomUUID(), new Date("2026-11-15"), "14:00", "14:30"), ScheduleConflictError);
  assert.equal(writes, 0);
});

test("si aparece una cita concurrente se reintenta y se rechaza la excepción", async () => {
  let attempts = 0;
  let writes = 0;
  const tx = {
    dentalUnit: { count: async () => 1 },
    scheduleException: { findFirst: async () => null, create: async () => {
      writes++;
      throw new Prisma.PrismaClientKnownRequestError("Conflicto concurrente", { code: "P2034", clientVersion: "test" });
    } },
    appointment: { findMany: async () => attempts === 1 ? [] : [appointment("CONFIRMED")] },
  };
  const database = { $transaction: async (operation: (db: typeof tx) => Promise<unknown>, options: unknown) => {
    attempts++;
    assert.deepEqual(options, { isolationLevel: "Serializable" });
    return operation(tx);
  } };
  const repository = new ExceptionRepository(tx as unknown as Prisma.TransactionClient, database as unknown as Pick<PrismaClient, "$transaction">);
  await assert.rejects(new ExceptionService(repository).create(input, actorId), ScheduleConflictError);
  assert.equal(attempts, 2);
  assert.equal(writes, 1);
});

test("la excepción y su auditoría se confirman o revierten en la misma transacción", async () => {
  let saved = false;
  let failAudit = true;
  const tx = {
    dentalUnit: { count: async () => 1 },
    scheduleException: {
      findFirst: async () => null,
      create: async () => { saved = true; return { id: "exception", status: "CONFIRMED" }; },
    },
    appointment: { findMany: async () => [] },
    auditLog: { create: async () => {
      if (failAudit) throw new Error("Audit failed");
      return {};
    } },
  };
  const database = { $transaction: async (operation: (db: typeof tx) => Promise<unknown>) => {
    const before = saved;
    try { return await operation(tx); }
    catch (error) { saved = before; throw error; }
  } };
  const service = new ExceptionService(new ExceptionRepository(tx as unknown as Prisma.TransactionClient, database as unknown as Pick<PrismaClient, "$transaction">));
  await assert.rejects(service.create(input, actorId), /Audit failed/);
  assert.equal(saved, false);
  failAudit = false;
  await service.create(input, actorId);
  assert.equal(saved, true);
});
