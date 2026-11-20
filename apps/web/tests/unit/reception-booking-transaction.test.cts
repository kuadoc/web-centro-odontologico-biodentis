import assert from "node:assert/strict";
import { test } from "node:test";
import type { PrismaClient } from "@prisma/client";
import { AppointmentRepository } from "@/modules/appointments/appointment.repository";
import { DomainError } from "@/lib/errors";

const input = { patientId: "patient", dentistId: "dentist", treatmentId: "service", date: new Date("2030-01-07"), startTime: "09:00", endTime: "09:45", status: "CONFIRMED" as const };

for (const patient of [null, { role: "PATIENT", isActive: false }, { role: "ADMIN", isActive: true }]) {
  test(`no reserva para un paciente inexistente, desactivado o de otro rol: ${JSON.stringify(patient)}`, async () => {
    let writes = 0;
    const tx = {
      dentist: { findUnique: async () => ({ user: { role: "DENTIST", isActive: true } }) },
      scheduleException: { findFirst: async () => null },
      availability: { findMany: async () => [{ startTime: "08:00", endTime: "18:00" }] },
      user: { findUnique: async () => patient },
      appointment: { findFirst: async () => null, create: async () => { writes++; } },
    };
    const database = { $transaction: async (operation: (client: typeof tx) => Promise<unknown>) => operation(tx) };
    await assert.rejects(new AppointmentRepository(database as unknown as Pick<PrismaClient, "$transaction">).create(input, "receptionist"), DomainError);
    assert.equal(writes, 0);
  });
}

test("la reserva confirmada y su responsable se auditan en la misma transacción y se revierten si falla la auditoría", async () => {
  let saved = false;
  let auditFails = true;
  const tx = {
    emailOutbox: { upsert: async () => ({}) },
    dentist: { findUnique: async () => ({ user: { role: "DENTIST", isActive: true } }) },
    scheduleException: { findFirst: async () => null },
    availability: { findMany: async () => [{ startTime: "08:00", endTime: "18:00" }] },
    user: { findUnique: async () => ({ role: "PATIENT", isActive: true }) },
    appointment: { findFirst: async () => null, create: async () => { saved = true; return { id: "appointment", ...input }; } },
    auditLog: { create: async ({ data }: { data: { userId: string; action: string; resourceId: string; details: string } }) => {
      assert.equal(data.userId, "receptionist");
      assert.equal(data.action, "CREATE_CONFIRMED_APPOINTMENT");
      assert.equal(data.resourceId, "appointment");
      assert.equal(JSON.parse(data.details).status, "CONFIRMED");
      if (auditFails) throw new Error("Audit failed");
      return {};
    } },
  };
  const database = { $transaction: async (operation: (client: typeof tx) => Promise<unknown>, options: unknown) => {
    assert.deepEqual(options, { isolationLevel: "Serializable" });
    const before = saved;
    try { return await operation(tx); }
    catch (error) { saved = before; throw error; }
  } };
  const repository = new AppointmentRepository(database as unknown as Pick<PrismaClient, "$transaction">);
  await assert.rejects(repository.create(input, "receptionist"), /Audit failed/);
  assert.equal(saved, false);
  auditFails = false;
  assert.equal((await repository.create(input, "receptionist")).status, "CONFIRMED");
  assert.equal(saved, true);
});
