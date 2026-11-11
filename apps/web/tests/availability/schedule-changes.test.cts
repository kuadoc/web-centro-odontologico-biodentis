import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test, type TestContext } from "node:test";
import { Prisma, type PrismaClient } from "@prisma/client";
import { AvailabilityService } from "@/modules/availability/availability.service";
import { AvailabilityRepository } from "@/modules/availability/availability.repository";
import { AppointmentRepository } from "@/modules/appointments/appointment.repository";
import { ScheduleConflictError } from "@/lib/errors";

const dentistId = randomUUID();
const actorId = randomUUID();
const original = [{ dayOfWeek: 3, startTime: "09:00", endTime: "18:00" }];
const appointment = (status = "PENDING", date = "2030-01-09", startTime = "14:00", endTime = "14:30") => ({ id: randomUUID(), status, date: new Date(date), startTime, endTime });

function fixture(context: TestContext) {
  const repository = new AvailabilityRepository();
  context.mock.method(repository, "withTransaction", async (operation: (repo: AvailabilityRepository) => Promise<unknown>) => operation(repository));
  const appointments = context.mock.method(repository, "findScheduledAppointments", async () => [appointment()]);
  const replace = context.mock.method(repository, "replaceWeek", async () => {});
  const upsert = context.mock.method(repository, "upsert", async (_id: string, data: unknown) => data);
  const read = context.mock.method(repository, "findByDentist", async () => original);
  const audit = context.mock.method(repository, "recordScheduleChange", async () => ({}));
  return { service: new AvailabilityService(repository), appointments, replace, upsert, read, audit };
}

for (const status of ["PENDING", "CONFIRMED"]) {
  test(`no elimina el miércoles con una cita ${status} a las 14:00`, async (context) => {
    const state = fixture(context);
    state.appointments.mock.mockImplementation(async () => [appointment(status)]);
    await assert.rejects(state.service.replaceWeekly(dentistId, { days: [] }, actorId), (error: unknown) => error instanceof ScheduleConflictError && error.message.includes("Miércoles:") && error.message.includes("2030-01-09, 14:00–14:30"));
    assert.equal(state.replace.mock.callCount(), 0);
    assert.equal(state.audit.mock.callCount(), 0);
  });
}

for (const [startTime, endTime] of [["09:00", "14:15"], ["14:15", "18:00"], ["15:00", "18:00"]]) {
  test(`no reduce la jornada a ${startTime}–${endTime} si deja fuera parte de una cita`, async (context) => {
    const state = fixture(context);
    await assert.rejects(state.service.replaceWeekly(dentistId, { days: [{ dayOfWeek: 3, startTime, endTime }] }, actorId), ScheduleConflictError);
    assert.equal(state.replace.mock.callCount(), 0);
  });
}

test("acepta conservar y ampliar el horario cuando cubre la cita completa", async (context) => {
  const state = fixture(context);
  for (const [startTime, endTime] of [["14:00", "14:30"], ["08:00", "20:00"], ["09:00", "18:00"]]) {
    await state.service.replaceWeekly(dentistId, { days: [{ dayOfWeek: 3, startTime, endTime }] }, actorId);
  }
  assert.equal(state.replace.mock.callCount(), 3);
  assert.equal(state.audit.mock.callCount(), 3);
});

test("permite quitar días sin citas por atender y guardar una semana vacía", async (context) => {
  const state = fixture(context);
  state.appointments.mock.mockImplementation(async () => []);
  await state.service.replaceWeekly(dentistId, { days: [] }, actorId);
  assert.deepEqual(state.replace.mock.calls[0]?.arguments, [dentistId, []]);
  assert.equal(state.audit.mock.callCount(), 1);
});

test("no bloquea quitar otro día que no cubre ninguna cita", async (context) => {
  const state = fixture(context);
  await state.service.replaceWeekly(dentistId, { days: original }, actorId);
  assert.equal(state.replace.mock.callCount(), 1);
});

test("al quitar miércoles solo muestra sus citas; no mezcla conflictos antiguos del viernes", async (context) => {
  const state = fixture(context);
  const friday = { dayOfWeek: 5, startTime: "09:00", endTime: "18:00" };
  state.read.mock.mockImplementation(async () => [...original, friday]);
  state.appointments.mock.mockImplementation(async () => [
    appointment("CONFIRMED", "2026-10-09", "10:00", "23:08"),
    appointment("PENDING", "2026-10-09", "21:31", "22:00"),
    appointment("PENDING", "2026-10-28", "13:00", "13:30"),
  ]);
  await assert.rejects(state.service.replaceWeekly(dentistId, { days: [friday] }), (error: unknown) => {
    assert.ok(error instanceof ScheduleConflictError);
    assert.match(error.message, /Miércoles: aún hay 1 cita programada/);
    assert.match(error.message, /2026-10-28, 13:00–13:30/);
    assert.doesNotMatch(error.message, /Viernes|2026-10-09|23:08|21:31/);
    return true;
  });
  assert.equal(state.replace.mock.callCount(), 0);
});

test("un conflicto antiguo de otro día no bloquea quitar un día sin citas", async (context) => {
  const state = fixture(context);
  const friday = { dayOfWeek: 5, startTime: "09:00", endTime: "18:00" };
  state.read.mock.mockImplementation(async () => [...original, friday]);
  state.appointments.mock.mockImplementation(async () => [appointment("PENDING", "2026-10-09", "21:31", "22:00")]);
  await state.service.replaceWeekly(dentistId, { days: [friday] });
  assert.equal(state.replace.mock.callCount(), 1);
});

test("al reducir horas se consideran únicamente las franjas retiradas de ese día", async (context) => {
  const state = fixture(context);
  state.appointments.mock.mockImplementation(async () => [
    appointment("PENDING", "2030-01-09", "20:00", "21:00"),
    appointment("CONFIRMED", "2030-01-09", "16:00", "16:30"),
  ]);
  await state.service.replaceWeekly(dentistId, { days: [{ dayOfWeek: 3, startTime: "09:00", endTime: "17:00" }] });
  assert.equal(state.replace.mock.callCount(), 1);
  state.appointments.mock.mockImplementation(async () => [appointment("CONFIRMED", "2030-01-09", "16:45", "17:15")]);
  await assert.rejects(state.service.replaceWeekly(dentistId, { days: [{ dayOfWeek: 3, startTime: "09:00", endTime: "17:00" }] }), ScheduleConflictError);
  assert.equal(state.replace.mock.callCount(), 1);
});

test("si se desactivan varios días sus mensajes se presentan en bloques separados", async (context) => {
  const state = fixture(context);
  state.read.mock.mockImplementation(async () => [...original, { dayOfWeek: 5, startTime: "09:00", endTime: "18:00" }]);
  state.appointments.mock.mockImplementation(async () => [appointment(), appointment("CONFIRMED", "2030-01-11")]);
  await assert.rejects(state.service.replaceWeekly(dentistId, { days: [] }), (error: unknown) => error instanceof ScheduleConflictError && error.message.includes("\n\nMiércoles:") && error.message.includes("\n\nViernes:"));
});

test("guardar sin reducir ni quitar días no revisa conflictos de horarios anteriores", async (context) => {
  const state = fixture(context);
  await state.service.replaceWeekly(dentistId, { days: original });
  assert.equal(state.appointments.mock.callCount(), 0);
  assert.equal(state.replace.mock.callCount(), 1);
});

test("también valida la modificación individual de un día", async (context) => {
  const state = fixture(context);
  await assert.rejects(state.service.configure(dentistId, { dayOfWeek: 3, startTime: "09:00", endTime: "13:00" }), ScheduleConflictError);
  assert.equal(state.upsert.mock.callCount(), 0);
  await state.service.configure(dentistId, { dayOfWeek: 3, startTime: "09:00", endTime: "18:00" });
  assert.equal(state.upsert.mock.callCount(), 1);
});

test("el error resume varios conflictos sin revelar datos del paciente", async (context) => {
  const state = fixture(context);
  state.appointments.mock.mockImplementation(async () => Array.from({ length: 5 }, (_, index) => appointment(index % 2 ? "CONFIRMED" : "PENDING")));
  await assert.rejects(state.service.replaceWeekly(dentistId, { days: [] }), (error: unknown) => error instanceof ScheduleConflictError && error.message.includes("5 citas programadas") && error.message.includes("entre otras"));
  assert.equal(state.replace.mock.callCount(), 0);
  assert.equal(state.audit.mock.callCount(), 0);
});

test("rechaza días fraccionarios, horas inválidas y rangos invertidos antes de consultar o escribir", async (context) => {
  const state = fixture(context);
  for (const day of [
    { dayOfWeek: 2.5, startTime: "09:00", endTime: "18:00" },
    { dayOfWeek: 3, startTime: "25:00", endTime: "26:00" },
    { dayOfWeek: 3, startTime: "09:60", endTime: "18:00" },
    { dayOfWeek: 3, startTime: "18:00", endTime: "09:00" },
  ]) await assert.rejects(state.service.replaceWeekly(dentistId, { days: [day] }));
  assert.equal(state.appointments.mock.callCount(), 0);
  assert.equal(state.replace.mock.callCount(), 0);
});

function databaseFixture() {
  let days = original.map((day) => ({ ...day }));
  const appointments: ReturnType<typeof appointment>[] = [];
  let audits = 0;
  let auditFailure = false;
  const tx = {
    appointment: {
      findMany: async (query: { where: { dentistId: string; status: { in: string[] } } }) => {
        assert.equal(query.where.dentistId, dentistId);
        assert.deepEqual(query.where.status.in, ["PENDING", "CONFIRMED"]);
        return appointments.filter((entry) => query.where.status.in.includes(entry.status));
      },
    },
    availability: {
      deleteMany: async () => { days = []; },
      createMany: async ({ data }: { data: typeof original }) => { days = data; },
      findMany: async () => days,
    },
    auditLog: { create: async () => { if (auditFailure) throw new Error("Audit failed"); audits++; } },
  };
  const database = {
    $transaction: async (operation: (client: typeof tx) => Promise<unknown>, options: unknown) => {
      assert.deepEqual(options, { isolationLevel: "Serializable" });
      const before = days.map((day) => ({ ...day }));
      try { return await operation(tx); }
      catch (error) { days = before; throw error; }
    },
  };
  return {
    service: new AvailabilityService(new AvailabilityRepository(tx as unknown as Prisma.TransactionClient, database as unknown as Pick<PrismaClient, "$transaction">)),
    appointments, tx, database, days: () => days, audits: () => audits, failAudit: () => { auditFailure = true; },
  };
}

test("el repositorio consulta solo pendientes/confirmadas y conserva el horario ante un conflicto", async () => {
  const state = databaseFixture();
  state.appointments.push(appointment("COMPLETED"), appointment("CANCELLED"), appointment("NO_SHOW"));
  await state.service.replaceWeekly(dentistId, { days: original }, actorId);
  state.appointments.push(appointment());
  await assert.rejects(state.service.replaceWeekly(dentistId, { days: [] }, actorId), ScheduleConflictError);
  assert.equal(state.days().length, 1);
  assert.equal(state.audits(), 1);
});

test("un fallo de auditoría revierte el reemplazo completo", async () => {
  const state = databaseFixture();
  state.failAudit();
  await assert.rejects(state.service.replaceWeekly(dentistId, { days: [] }, actorId), /Audit failed/);
  assert.deepEqual(state.days(), original);
});

test("si aparece una cita durante el guardado se reintenta y se bloquea la eliminación", async (context) => {
  const state = databaseFixture();
  const originalTransaction = state.database.$transaction;
  let attempts = 0;
  context.mock.method(state.database, "$transaction", async (operation: (client: typeof state.tx) => Promise<unknown>, options: unknown) => originalTransaction(async (tx) => {
    const result = await operation(tx);
    if (++attempts === 1) {
      state.appointments.push(appointment());
      throw new Prisma.PrismaClientKnownRequestError("Reserva concurrente", { code: "P2034", clientVersion: "test" });
    }
    return result;
  }, options));
  await assert.rejects(state.service.replaceWeekly(dentistId, { days: [] }), ScheduleConflictError);
  assert.deepEqual(state.days(), original);
});

test("una reserva concurrente relee el horario dentro de su transacción y no escribe si el día se eliminó", async () => {
  let reads = 0;
  let writes = 0;
  const tx = {
    dentist: { findUnique: async () => ({ user: { isActive: true, role: "DENTIST" } }) },
    scheduleException: { findFirst: async () => null },
    user: { findUnique: async () => ({ role: "PATIENT", isActive: true }) },
    availability: { findMany: async () => ++reads === 1 ? original : [] },
    appointment: {
      findFirst: async () => null,
      create: async () => { writes++; throw new Prisma.PrismaClientKnownRequestError("Horario concurrente", { code: "P2034", clientVersion: "test" }); },
    },
  };
  const database = { $transaction: async (operation: (client: typeof tx) => Promise<unknown>) => operation(tx) };
  await assert.rejects(new AppointmentRepository(database as unknown as Pick<PrismaClient, "$transaction">).create({ patientId: randomUUID(), dentistId, date: new Date("2030-01-09"), startTime: "14:00", endTime: "14:30" }), ScheduleConflictError);
  assert.equal(reads, 2);
  assert.equal(writes, 1);
});
