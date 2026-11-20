import assert from "node:assert/strict";
import { test } from "node:test";
import { AppointmentService } from "@/modules/appointments/appointment.service";
import { AppointmentRepository } from "@/modules/appointments/appointment.repository";
import { AuthorizationError, DomainError } from "@/lib/errors";
import { Role } from "@biodentis/shared-types";

test("registro clínico: solo el odontólogo asignado registra y su identidad llega a la transacción", async (context) => {
  let status = "CONFIRMED";
  let hasRecord = false;
  context.mock.method(AppointmentRepository.prototype, "findById", async () => ({ id: "appointment", patientId: "patient", dentistId: "treating-dentist", status, clinicalRecord: hasRecord ? { notes: "Nota" } : null }));
  const save = context.mock.method(AppointmentRepository.prototype, "completeWithRecord", async () => ({ id: "appointment", status: "COMPLETED" }));
  const service = new AppointmentService();
  const note = { diagnosis: "Gingivitis", treatment: "Profilaxis", nextControl: "6m" };
  const doctor = { role: Role.DENTIST, userId: "dentist-user", dentistId: "treating-dentist" };
  for (const actor of [
    { role: Role.RECEPTIONIST, userId: "reception-user" },
    { role: Role.DENTIST, userId: "other", dentistId: "another-dentist" },
    { role: Role.DENTIST, userId: "missing-profile" },
    { role: Role.PATIENT, userId: "patient" },
    { role: Role.ADMIN, userId: "admin" },
  ]) await assert.rejects(service.completeWithClinicalNote("appointment", note, actor), AuthorizationError);
  assert.equal(save.mock.callCount(), 0);
  await service.completeWithClinicalNote("appointment", note, doctor);
  assert.deepEqual(save.mock.calls[0]?.arguments.slice(0, 3), ["appointment", "patient", "treating-dentist"]);
  assert.match(String(save.mock.calls[0]?.arguments[3]), /Diagnóstico: Gingivitis\nTratamiento: Profilaxis\nPróximo control: En 6 meses/);
  assert.equal(save.mock.calls[0]?.arguments[4], doctor.userId);
  for (const invalid of [{ ...note, diagnosis: " " }, { ...note, treatment: "" }, { ...note, nextControl: "12m" }]) await assert.rejects(service.completeWithClinicalNote("appointment", invalid, doctor));
  status = "PENDING";
  await assert.rejects(service.completeWithClinicalNote("appointment", note, doctor), DomainError);
  status = "CONFIRMED";
  hasRecord = true;
  await assert.rejects(service.completeWithClinicalNote("appointment", note, doctor), DomainError);
  assert.equal(save.mock.callCount(), 1);
});
