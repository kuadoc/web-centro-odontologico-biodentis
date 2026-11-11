import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { Role } from "@biodentis/shared-types";
import { AppointmentService } from "@/modules/appointments/appointment.service";
import { AppointmentRepository } from "@/modules/appointments/appointment.repository";
import { AuthorizationError, DomainError } from "@/lib/errors";

const patientId = randomUUID();
const input = { date: "2030-01-08", startTime: "10:00", endTime: "11:00" };
for (const role of Object.values(Role)) {
  test(`reprogramación: ${role} respeta propiedad y permisos`, async (context) => {
    context.mock.method(AppointmentRepository.prototype, "findById", async () => ({ patientId, status: "CONFIRMED", clinicalRecord: null, date: new Date("2030-01-07"), startTime: "10:00", dentistId: randomUUID() }));
    context.mock.method(AppointmentRepository.prototype, "findConflicting", async () => null);
    const write = context.mock.method(AppointmentRepository.prototype, "reschedule", async () => ({ id: "test" }));
    const service = new AppointmentService();
    if (role === Role.DENTIST) {
      await assert.rejects(service.reschedule("test", input, { userId: patientId, role }), AuthorizationError);
      assert.equal(write.mock.callCount(), 0);
    } else {
      await service.reschedule("test", input, { userId: patientId, role });
      assert.equal(write.mock.callCount(), 1);
    }
    if (role === Role.PATIENT) await assert.rejects(service.reschedule("test", input, { userId: randomUUID(), role }), AuthorizationError);
  });
}
for (const status of ["CANCELLED", "COMPLETED", "NO_SHOW"]) {
  test(`reprogramación no altera citas ${status}`, async (context) => {
    context.mock.method(AppointmentRepository.prototype, "findById", async () => ({ patientId, status, clinicalRecord: null }));
    const write = context.mock.method(AppointmentRepository.prototype, "reschedule", async () => ({}));
    await assert.rejects(new AppointmentService().reschedule("test", input, { userId: patientId, role: Role.PATIENT }), DomainError);
    assert.equal(write.mock.callCount(), 0);
  });
}
