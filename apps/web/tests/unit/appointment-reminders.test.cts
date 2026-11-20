import assert from "node:assert/strict";
import { test } from "node:test";
import { EmailOutboxService } from "@/modules/appointments/email-outbox.service";
import { EmailOutboxRepository } from "@/modules/appointments/email-outbox.repository";
import { AppointmentNotificationService } from "@/modules/appointments/appointment-notification.service";
import { ReminderService } from "@/modules/appointments/reminder.service";
import { ReminderRepository } from "@/modules/appointments/reminder.repository";

test("recordatorio: revalida horario, descarta reprogramados y conserva fallos para reintento", async (context) => {
  const previous = process.env.EMAIL_MODE; process.env.EMAIL_MODE = "live";
  context.after(() => { if (previous === undefined) delete process.env.EMAIL_MODE; else process.env.EMAIL_MODE = previous; });
  const jobs = ["REMINDER:2099-01-01:10:00", "REMINDER:2099-01-02:10:00", "REMINDER:2099-01-02:10:00"].map((kind, index) => ({ id: `job-${index}`, kind, appointmentId: "appointment", attempts: 1, lockedUntil: new Date() }));
  context.mock.method(EmailOutboxRepository.prototype, "claim", async () => jobs.shift());
  context.mock.method(EmailOutboxRepository.prototype, "appointment", async () => ({ status: "CONFIRMED", date: new Date("2099-01-02"), startTime: "10:00", patient: { email: "patient@example.test" } }));
  let calls = 0;
  const send = context.mock.method(AppointmentNotificationService.prototype, "sendReminderNotice", async () => ++calls === 1);
  const finish = context.mock.method(EmailOutboxRepository.prototype, "finish", async () => ({ count: 1 }));
  const result = await new EmailOutboxService().drain();
  assert.deepEqual(result, { processed: 3, failed: 1 });
  assert.equal(send.mock.callCount(), 2);
  assert.equal(send.mock.calls[0]!.arguments[1], "job-1");
  assert.deepEqual(finish.mock.calls.map((call) => call.arguments[4]), ["OBSOLETE", "SMTP_ACCEPTED", "RETRY"]);
});
test("trabajador: persiste inicio/fin y contabiliza incidencias", async (context) => {
  context.mock.method(ReminderRepository.prototype, "start", async () => ({ id: "run" }));
  context.mock.method(ReminderRepository.prototype, "schedule", async () => 3);
  context.mock.method(EmailOutboxService.prototype, "drain", async () => ({ processed: 2, failed: 1 }));
  const finish = context.mock.method(ReminderRepository.prototype, "finish", async () => ({}));
  assert.deepEqual(await new ReminderService().run(), { scheduled: 3, processed: 2, failed: 1 });
  assert.deepEqual(finish.mock.calls[0]!.arguments, ["run", false, 2, 1]);
});
