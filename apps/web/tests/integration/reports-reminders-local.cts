import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { prisma } from "@/lib/prisma";
import { ReminderRepository } from "@/modules/appointments/reminder.repository";
import { EmailOutboxRepository } from "@/modules/appointments/email-outbox.repository";

test("PostgreSQL local: recordatorio a -24h, idempotencia, cambio de horario y claim/reintento", { skip: process.env.RUN_LOCAL_DATABASE_TESTS !== "1" }, async () => {
  const target = new URL(process.env.DATABASE_URL!);
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(target.hostname), "Solo se permiten pruebas contra PostgreSQL local");
  const rollback = new Error("ROLLBACK_REMINDER_TEST");
  try {
    await prisma.$transaction(async (tx) => {
      const patient = await tx.user.create({ data: { email: `${randomUUID()}@patients.invalid`, firstName: "Prueba", lastName: "Recordatorio", role: "PATIENT", passwordHash: "not-a-login-hash" } });
      const dentistUser = await tx.user.create({ data: { email: `${randomUUID()}@example.invalid`, firstName: "Prueba", lastName: "Dentista", role: "DENTIST", passwordHash: "not-a-login-hash" } });
      const dentist = await tx.dentist.create({ data: { userId: dentistUser.id, specialty: "Prueba" } });
      const appointment = await tx.appointment.create({ data: { patientId: patient.id, dentistId: dentist.id, date: new Date("2099-01-02"), startTime: "10:00", endTime: "10:30", status: "CONFIRMED" } });
      const repository = new ReminderRepository(tx);
      assert.equal(await repository.schedule(appointment.id), 1);
      assert.equal(await repository.schedule(appointment.id), 0);
      const job = await tx.emailOutbox.findFirstOrThrow({ where: { appointmentId: appointment.id } });
      assert.equal(job.kind, "REMINDER:2099-01-02:10:00");
      assert.equal(job.availableAt.toISOString(), "2099-01-01T15:00:00.000Z");
      const outbox = new EmailOutboxRepository(tx);
      assert.equal(await outbox.claim(appointment.id), undefined);
      await tx.appointment.update({ where: { id: appointment.id }, data: { startTime: "11:00", endTime: "11:30" } });
      assert.equal(await repository.schedule(appointment.id), 1);
      await tx.emailOutbox.update({ where: { id: job.id }, data: { availableAt: new Date(Date.now() - 1000) } });
      const claimed = await outbox.claim(appointment.id);
      assert.equal(claimed?.id, job.id); assert.equal(claimed?.attempts, 1);
      await outbox.finish(claimed!.id, claimed!.lockedUntil, false, claimed!.attempts, "RETRY");
      const retry = await tx.emailOutbox.findUniqueOrThrow({ where: { id: job.id } });
      assert.equal(retry.outcome, "RETRY"); assert.equal(retry.deliveredAt, null);
      assert.ok(retry.availableAt > new Date());
      const run = await repository.start(); await repository.finish(run.id, true, 1, 0);
      assert.equal((await tx.scheduledJobRun.findUniqueOrThrow({ where: { id: run.id } })).success, true);
      throw rollback;
    }, { timeout: 20000 });
  } catch (error) { if (error !== rollback) throw error; }
  finally { await prisma.$disconnect(); }
});
