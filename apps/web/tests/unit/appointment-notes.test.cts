import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { RequestAppointmentSchema } from "@biodentis/shared-validators";
import { AppointmentService } from "@/modules/appointments/appointment.service";
import { AppointmentRepository } from "@/modules/appointments/appointment.repository";

const input = { dentistId: randomUUID(), date: "2026-11-20", startTime: "16:00", endTime: "16:30" };

test("notas omitidas, vacías o con solo espacios siguen siendo opcionales", () => {
  for (const notes of [undefined, "", "   ", "\n\t"]) {
    assert.equal(RequestAppointmentSchema.parse({ ...input, notes }).notes, undefined);
    assert.equal(RequestAppointmentSchema.shape.notes.parse(notes), undefined);
  }
});

test("rechaza notas de 1 a 9 caracteres tanto en el campo como en la reserva", () => {
  for (const notes of ["a", "dolor", "123456789", "     dolor     "]) {
    const field = RequestAppointmentSchema.shape.notes.safeParse(notes);
    assert.equal(field.success, false);
    if (!field.success) assert.match(field.error.issues[0]!.message, /10 caracteres/);
    const booking = RequestAppointmentSchema.safeParse({ ...input, notes });
    assert.equal(booking.success, false);
    if (!booking.success) assert.equal(booking.error.issues[0]?.path[0], "notes");
  }
});

test("acepta exactamente 10 caracteres y elimina espacios exteriores", () => {
  for (const notes of ["1234567890", "  1234567890  "]) {
    assert.equal(RequestAppointmentSchema.parse({ ...input, notes }).notes, "1234567890");
  }
  assert.equal(RequestAppointmentSchema.parse({ ...input, notes: "Dolor en una muela" }).notes, "Dolor en una muela");
});

test("el backend rechaza notas cortas antes de consultar la agenda o guardar", async (context) => {
  const reads = context.mock.method(AppointmentRepository.prototype, "findConflicting", async () => null);
  const writes = context.mock.method(AppointmentRepository.prototype, "create", async () => { throw new Error("No debe guardar"); });
  await assert.rejects(new AppointmentService().create({ ...input, notes: "dolor" }, randomUUID()), (error: unknown) =>
    error instanceof Error && error.message.includes("10 caracteres")
  );
  assert.equal(reads.mock.callCount(), 0);
  assert.equal(writes.mock.callCount(), 0);
});
