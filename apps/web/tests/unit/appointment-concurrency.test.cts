import assert from "node:assert/strict";
import { test } from "node:test";
import { Prisma, type PrismaClient } from "@prisma/client";
import { AppointmentRepository } from "@/modules/appointments/appointment.repository";
import { NotFoundError, ScheduleConflictError } from "@/lib/errors";

// Se inyecta un ejecutor falso: estas pruebas nunca abren una conexión a la BD.
const database = { $transaction: async () => { throw new Error("Transacción sin simular"); } };
function repository() {
  return new AppointmentRepository(database as unknown as Pick<PrismaClient, "$transaction">);
}

const reservation = {
  patientId: "patient",
  dentistId: "dentist",
  date: new Date("2030-01-07T00:00:00Z"),
  startTime: "09:00",
  endTime: "10:00",
};

function databaseError(code: string) {
  return new Prisma.PrismaClientKnownRequestError("Fixture de conflicto", { code, clientVersion: "test" });
}

test("reserva: comprueba solapamientos y guarda en la misma transacción serializable", async (context) => {
  const queries: unknown[] = [];
  const transaction = {
    appointment: {
      findFirst: async (query: unknown) => { queries.push(query); return null; },
      create: async ({ data }: { data: typeof reservation }) => ({ id: "created", ...data }),
    },
  };
  context.mock.method(database, "$transaction", async (operation: (tx: typeof transaction) => Promise<unknown>, options: unknown) => {
    assert.deepEqual(options, { isolationLevel: "Serializable" });
    return operation(transaction);
  });
  const result = await repository().create(reservation);
  assert.equal(result.id, "created");
  assert.deepEqual(queries, [{
    where: {
      dentistId: "dentist", date: reservation.date,
      startTime: { lt: "10:00" }, endTime: { gt: "09:00" },
      status: { not: "CANCELLED" },
    },
    select: { id: true },
  }]);
});

test("un conflicto concurrente reintenta la lectura y rechaza el horario ocupado", async (context) => {
  let reads = 0;
  let writes = 0;
  const transaction = {
    appointment: {
      findFirst: async () => ++reads === 1 ? null : { id: "other-reservation" },
      create: async () => { writes++; throw databaseError("P2034"); },
    },
  };
  const attempt = context.mock.method(database, "$transaction", async (operation: (tx: typeof transaction) => Promise<unknown>) => operation(transaction));
  await assert.rejects(repository().create(reservation), ScheduleConflictError);
  assert.equal(attempt.mock.callCount(), 2);
  assert.equal(reads, 2);
  assert.equal(writes, 1);
});

test("reintentos agotados y colisión única se convierten en errores de agenda", async (context) => {
  for (const [code, attempts] of [["P2034", 3], ["P2002", 1]] as const) {
    const attempt = context.mock.method(database, "$transaction", async () => { throw databaseError(code); });
    await assert.rejects(repository().create(reservation), ScheduleConflictError);
    assert.equal(attempt.mock.callCount(), attempts);
    attempt.mock.restore();
  }
});

test("un fallo de infraestructura no se convierte en un conflicto de agenda ni se reintenta", async (context) => {
  const failure = databaseError("P1001");
  const attempt = context.mock.method(database, "$transaction", async () => { throw failure; });
  await assert.rejects(repository().create(reservation), (error) => error === failure);
  assert.equal(attempt.mock.callCount(), 1);
});

test("reprogramar excluye la cita actual y no escribe si otro intervalo se solapa", async (context) => {
  let occupied = false;
  let writes = 0;
  const transaction = {
    appointment: {
      findUnique: async () => ({ dentistId: "dentist" }),
      findFirst: async (query: { where: { id: { not: string } } }) => {
        assert.deepEqual(query.where.id, { not: "current" });
        return occupied ? { id: "other" } : null;
      },
      update: async () => { writes++; return { id: "current" }; },
    },
  };
  context.mock.method(database, "$transaction", async (operation: (tx: typeof transaction) => Promise<unknown>, options: unknown) => {
    assert.deepEqual(options, { isolationLevel: "Serializable" });
    return operation(transaction);
  });
  const appointments = repository();
  assert.equal((await appointments.reschedule("current", reservation.date, "09:00", "10:00")).id, "current");
  occupied = true;
  await assert.rejects(appointments.reschedule("current", reservation.date, "09:00", "10:00"), ScheduleConflictError);
  assert.equal(writes, 1);
});

test("reprogramar una cita inexistente no escribe", async (context) => {
  const transaction = { appointment: { findUnique: async () => null } };
  context.mock.method(database, "$transaction", async (operation: (tx: typeof transaction) => Promise<unknown>) => operation(transaction));
  await assert.rejects(repository().reschedule("missing", reservation.date, "09:00", "10:00"), NotFoundError);
});
