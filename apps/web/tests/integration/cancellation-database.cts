import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { prisma } from "@/lib/prisma";
import { CancellationService } from "@/modules/appointments/cancellation.service";
import { CancellationRepository } from "@/modules/appointments/cancellation.repository";
import { AppointmentRepository } from "@/modules/appointments/appointment.repository";

// Prueba opt-in: únicamente PostgreSQL local; fixtures propios eliminados al terminar.
test("PostgreSQL: cancelación, concurrencia, auditoría atómica y reutilización del turno", async (context) => {
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL!).hostname), "La prueba solo puede escribir en la base local");
  const userIds = Array.from({ length: 4 }, () => randomUUID());
  const appointmentIds: string[] = [];
  const reason = "El paciente necesita viajar y solicita la cancelación.";
  const reviewReason = "Administración valida los antecedentes y autoriza el cambio.";
  let dentistId: string | undefined;
  try {
    for (const [index, role] of (["RECEPTIONIST", "ADMIN", "PATIENT", "DENTIST"] as const).entries()) {
      await prisma.user.create({ data: { id: userIds[index], email: `cancellation-${randomUUID()}@example.test`, firstName: "Temporal", lastName: role, role, passwordHash: "disabled-test-account" } });
    }
    const dentist = await prisma.dentist.create({ data: { userId: userIds[3]!, specialty: "Prueba" } });
    dentistId = dentist.id;
    const create = async (status: "PENDING" | "CONFIRMED", time: string) => {
      const appointment = await prisma.appointment.create({ data: { patientId: userIds[2]!, dentistId: dentist.id, date: new Date("2030-01-07"), startTime: time, endTime: `${String(Number(time.slice(0, 2)) + 1).padStart(2, "0")}:00`, status } });
      appointmentIds.push(appointment.id);
      return appointment;
    };
    const service = new CancellationService();
    const pending = await create("PENDING", "09:00");
    await service.cancel(pending.id, { reason }, userIds[0]!);
    assert.equal((await prisma.appointment.findUniqueOrThrow({ where: { id: pending.id } })).status, "CANCELLED");
    // La clave antigua impedía volver a reservar un turno cancelado.
    const replacement = await create("CONFIRMED", "09:00");
    assert.notEqual(replacement.id, pending.id);
    await assert.rejects(new AppointmentRepository().updateStatus(pending.id, "CONFIRMED"));
    assert.equal((await prisma.appointment.findUniqueOrThrow({ where: { id: pending.id } })).status, "CANCELLED");

    const confirmed = await create("CONFIRMED", "10:00");
    const requests = await Promise.allSettled([service.request(confirmed.id, { reason }, userIds[0]!), service.request(confirmed.id, { reason }, userIds[0]!)]);
    assert.equal(requests.filter((entry) => entry.status === "fulfilled").length, 1);
    assert.equal(await prisma.appointmentCancellation.count({ where: { appointmentId: confirmed.id } }), 1);
    assert.equal((await prisma.appointment.findUniqueOrThrow({ where: { id: confirmed.id } })).status, "CONFIRMED");
    const request = await prisma.appointmentCancellation.findUniqueOrThrow({ where: { activeAppointmentId: confirmed.id } });
    await assert.rejects(new AppointmentRepository().reschedule(confirmed.id, new Date("2030-01-08"), "10:00", "11:00"), /Resuelve la solicitud/);
    const decisions = await Promise.allSettled([service.review(request.id, { decision: "APPROVE", reason: reviewReason }, userIds[1]!), service.review(request.id, { decision: "APPROVE", reason: reviewReason }, userIds[1]!)]);
    assert.equal(decisions.filter((entry) => entry.status === "fulfilled").length, 1);
    const cancelled = await prisma.appointment.findUniqueOrThrow({ where: { id: confirmed.id } });
    assert.equal(cancelled.status, "CANCELLED");
    assert.equal(cancelled.cancelledById, userIds[1]);
    assert.equal(cancelled.cancellationReason, `Recepción: ${reason}\nAdministración: ${reviewReason}`);
    await assert.rejects(new AppointmentRepository().reschedule(confirmed.id, new Date("2030-01-08"), "10:00", "11:00"), /cambió de estado/);
    assert.equal(await prisma.auditLog.count({ where: { resourceId: confirmed.id, action: "APPROVE_APPOINTMENT_CANCELLATION" } }), 1);

    const rejected = await service.request(replacement.id, { reason }, userIds[0]!);
    await service.review(rejected.id, { decision: "REJECT", reason: reviewReason }, userIds[1]!);
    assert.equal((await prisma.appointment.findUniqueOrThrow({ where: { id: replacement.id } })).status, "CONFIRMED");
    const report = await service.report({ page: 1, pageSize: 100 });
    assert.ok(report.summary.approved >= 2);
    assert.ok(report.summary.rejected >= 1);
    assert.equal(report.activity.length, 6);
    assert.ok(report.activity.some((month) => month.cancellations >= 2));

    const rollback = await create("PENDING", "11:00");
    const audit = context.mock.method(CancellationRepository.prototype, "record", async () => { throw new Error("Fallo simulado de auditoría"); });
    await assert.rejects(service.cancel(rollback.id, { reason }, userIds[0]!), /Fallo simulado/);
    audit.mock.restore();
    assert.equal((await prisma.appointment.findUniqueOrThrow({ where: { id: rollback.id } })).status, "PENDING");
    assert.equal(await prisma.appointmentCancellation.count({ where: { appointmentId: rollback.id } }), 0);
  } finally {
    await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.appointmentCancellation.deleteMany({ where: { appointmentId: { in: appointmentIds } } });
    await prisma.appointment.deleteMany({ where: { id: { in: appointmentIds } } });
    if (dentistId) await prisma.dentist.delete({ where: { id: dentistId } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  }
});
