import assert from "node:assert/strict";
import { test } from "node:test";
import { AppointmentService } from "@/modules/appointments/appointment.service";
import { AppointmentRepository } from "@/modules/appointments/appointment.repository";
import { AuditService } from "@/modules/audit/audit.service";
import { AuthorizationError, DomainError } from "@/lib/errors";
import { Role } from "@biodentis/shared-types";

test("registro clínico: permisos, validación y atribución al odontólogo tratante", async (context) => {
  let status = "CONFIRMED";
  let hasRecord = false;
  context.mock.method(AppointmentRepository.prototype, "findById", async () => ({
    id: "appointment", patientId: "patient", dentistId: "treating-dentist", status,
    clinicalRecord: hasRecord ? { notes: "Nota existente" } : null,
  }));
  const save = context.mock.method(AppointmentRepository.prototype, "completeWithRecord", async () => ({ id: "appointment", status: "COMPLETED" }));
  const audit = context.mock.method(AuditService.prototype, "log", async () => ({}));
  const service = new AppointmentService();
  const note = { diagnosis: "Gingivitis", treatment: "Profilaxis", nextControl: "6m" };
  const receptionist = { role: Role.RECEPTIONIST, userId: "reception-user" };

  await service.completeWithClinicalNote("appointment", note, receptionist);
  assert.deepEqual(save.mock.calls[0]?.arguments.slice(0, 3), ["appointment", "patient", "treating-dentist"]);
  assert.match(String(save.mock.calls[0]?.arguments[3]), /Diagnóstico: Gingivitis\nTratamiento: Profilaxis\nPróximo control: En 6 meses/);
  assert.equal(audit.mock.calls[0]?.arguments[0], "reception-user", "La auditoría identifica a quien registra, sin sustituir al odontólogo tratante");

  await service.completeWithClinicalNote("appointment", note, { role: Role.DENTIST, userId: "dentist-user", dentistId: "treating-dentist" });
  const savedCount = save.mock.callCount();
  for (const actor of [
    { role: Role.DENTIST, userId: "other", dentistId: "another-dentist" },
    { role: Role.DENTIST, userId: "missing-profile" },
    { role: Role.PATIENT, userId: "patient" },
    { role: Role.ADMIN, userId: "admin" },
  ]) {
    await assert.rejects(service.completeWithClinicalNote("appointment", note, actor), AuthorizationError);
  }
  for (const invalid of [{ ...note, diagnosis: " " }, { ...note, treatment: "" }, { ...note, nextControl: "12m" }]) {
    await assert.rejects(service.completeWithClinicalNote("appointment", invalid, receptionist));
  }
  status = "PENDING";
  await assert.rejects(service.completeWithClinicalNote("appointment", note, receptionist), DomainError);
  status = "CONFIRMED";
  hasRecord = true;
  await assert.rejects(service.completeWithClinicalNote("appointment", note, receptionist), DomainError);
  assert.equal(save.mock.callCount(), savedCount, "Los rechazos no guardan registros");
  assert.equal(audit.mock.callCount(), savedCount);
});
