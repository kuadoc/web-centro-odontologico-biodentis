import assert from "node:assert/strict";
import { test } from "node:test";
import { canCancelOrReschedule, ContactPhoneSchema, UpdateClinicSchema, CreatePatientSchema } from "@biodentis/shared-validators";
import { EmailOutboxService } from "@/modules/appointments/email-outbox.service";
import { EmailOutboxRepository } from "@/modules/appointments/email-outbox.repository";
import { AppointmentNotificationService } from "@/modules/appointments/appointment-notification.service";

test("24 horas: interpreta el horario de Lima y exige más de 24 horas exactas", () => {
  const date = new Date("2030-01-08T00:00:00Z");
  const at24 = new Date("2030-01-07T15:00:00Z"); // 10:00 de Lima.
  assert.equal(canCancelOrReschedule(date, "10:00", at24), false);
  assert.equal(canCancelOrReschedule(date, "10:00", new Date(at24.getTime() - 1)), true);
  assert.equal(canCancelOrReschedule(date, "10:00", new Date(at24.getTime() + 1)), false);
  assert.equal(canCancelOrReschedule(date, "99:99", at24), false);
});

test("contactos: alta presencial sin credenciales, teléfono numérico y RUC con longitud válida", () => {
  assert.equal(CreatePatientSchema.safeParse({ firstName: "Ana", lastName: "Prueba", phone: "900123456" }).success, true);
  for (const value of ["++++++", "abc12345", "12", "9".repeat(26)]) assert.equal(ContactPhoneSchema.safeParse(value).success, false);
  assert.equal(UpdateClinicSchema.safeParse({ rut: "123" }).success, false);
  assert.equal(UpdateClinicSchema.safeParse({ rut: "20000000000" }).success, true);
});

test("outbox: un fallo de correo conserva el trabajo para reintento; usa clave estable", async (context) => {
  const job = { id: "stable-message", appointmentId: "appointment", kind: "BOOKING", attempts: 1, lockedUntil: new Date() };
  let claimed = false;
  context.mock.method(EmailOutboxRepository.prototype, "claim", async () => { if (claimed) return undefined; claimed = true; return job; });
  context.mock.method(EmailOutboxRepository.prototype, "appointment", async () => ({ status: "CONFIRMED", patient: { email: "patient@example.test" } }));
  process.env.EMAIL_MODE = "live"; // El transporte está simulado, nunca se envía correo.
  const send = context.mock.method(AppointmentNotificationService.prototype, "sendBookingNotice", async () => false);
  const finish = context.mock.method(EmailOutboxRepository.prototype, "finish", async () => ({ count: 1 }));
  const result = await new EmailOutboxService().drain();
  assert.deepEqual(result, { processed: 1, failed: 1 });
  assert.deepEqual(send.mock.calls[0]!.arguments, ["appointment", "stable-message"]);
  assert.equal(finish.mock.calls[0]!.arguments[2], false);
});

test("outbox: un aviso obsoleto no envía correo ni se reintenta indefinidamente", async (context) => {
  let claimed = false;
  context.mock.method(EmailOutboxRepository.prototype, "claim", async () => { if (claimed) return undefined; claimed = true; return { id: "old", appointmentId: "appointment", kind: "BOOKING", attempts: 1, lockedUntil: new Date() }; });
  context.mock.method(EmailOutboxRepository.prototype, "appointment", async () => ({ status: "CANCELLED", patient: { email: "patient@example.test" } }));
  const send = context.mock.method(AppointmentNotificationService.prototype, "sendBookingNotice", async () => { throw new Error("No debe enviar"); });
  const finish = context.mock.method(EmailOutboxRepository.prototype, "finish", async () => ({ count: 1 }));
  await new EmailOutboxService().drain();
  assert.equal(send.mock.callCount(), 0);
  assert.equal(finish.mock.calls[0]!.arguments[2], true);
});
