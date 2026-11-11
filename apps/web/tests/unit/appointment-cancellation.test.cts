import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test, type TestContext } from "node:test";
import { Role } from "@biodentis/shared-types";
import { CancellationService } from "@/modules/appointments/cancellation.service";
import { CancellationRepository } from "@/modules/appointments/cancellation.repository";
import { AuthorizationError, DomainError } from "@/lib/errors";

const ids = { appointment: randomUUID(), actor: randomUUID(), patient: randomUUID(), dentist: randomUUID(), request: randomUUID(), receptionist: randomUUID() };
const reason = "El paciente solicita cancelar por un viaje familiar.";
const additional = "Se verificó la solicitud y se autoriza la cancelación.";
function fixture(context: TestContext, role = Role.RECEPTIONIST, status = "CONFIRMED") {
  const actor = { id: ids.actor, firstName: "Responsable", lastName: "Prueba", role, isActive: true };
  const appointment = { id: ids.appointment, status, date: new Date("2030-01-07"), startTime: "09:00", endTime: "10:00", clinicalRecord: null as null | { id: string }, patient: { id: ids.patient, firstName: "Paciente", lastName: "Prueba" }, dentist: { id: ids.dentist, user: { firstName: "Doctor", lastName: "Prueba" } } };
  const snapshot = { appointmentId: ids.appointment, patient: { id: ids.patient, name: "Paciente Prueba" }, dentist: { id: ids.dentist, name: "Doctor Prueba" }, date: "2030-01-07", startTime: "09:00", endTime: "10:00", requestedBy: { id: ids.receptionist, name: "Recepción Prueba", role: "RECEPTIONIST" } };
  const entry = { id: ids.request, appointmentId: ids.appointment, originalStatus: "CONFIRMED", state: "REQUESTED", activeAppointmentId: ids.appointment as string | null, snapshot, requestedById: ids.receptionist, requestReason: reason, reviewerSnapshot: null, reviewReason: null, createdAt: new Date(), reviewedAt: null };
  const repository = new CancellationRepository();
  context.mock.method(CancellationRepository.prototype, "withTransaction", async (operation: (repository: CancellationRepository) => Promise<unknown>) => operation(repository));
  context.mock.method(CancellationRepository.prototype, "findActor", async () => actor);
  context.mock.method(CancellationRepository.prototype, "findAppointment", async () => appointment);
  const open = context.mock.method(CancellationRepository.prototype, "findOpenRequest", async () => null);
  context.mock.method(CancellationRepository.prototype, "findRequest", async () => entry);
  const create = context.mock.method(CancellationRepository.prototype, "create", async (data: object) => ({ id: ids.request, state: "REQUESTED", ...data }));
  const cancel = context.mock.method(CancellationRepository.prototype, "cancelAppointment", async () => ({ count: 1 }));
  const resolve = context.mock.method(CancellationRepository.prototype, "resolve", async () => ({ count: 1 }));
  const record = context.mock.method(CancellationRepository.prototype, "record", async () => ({}));
  return { actor, appointment, entry, open, create, cancel, resolve, record, repository, service: new CancellationService(repository) };
}

for (const role of Object.values(Role)) for (const status of ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"]) {
  test(`cancelación directa: ${role}/${status}`, async (context) => {
    const state = fixture(context, role, status);
    if (role === Role.RECEPTIONIST && status === "PENDING") {
      const result = await state.service.cancel(ids.appointment, { reason }, ids.actor);
      assert.equal(result.state, "APPROVED");
      assert.equal(state.cancel.mock.callCount(), 1);
      const data = state.create.mock.calls[0]!.arguments[0] as { requestReason: string; requestedById: string; originalStatus: string };
      assert.equal(data.requestReason, reason);
      assert.equal(data.requestedById, ids.actor);
      assert.equal(data.originalStatus, "PENDING");
    } else {
      await assert.rejects(state.service.cancel(ids.appointment, { reason }, ids.actor), role === Role.RECEPTIONIST ? DomainError : AuthorizationError);
      assert.equal(state.cancel.mock.callCount(), 0);
      assert.equal(state.record.mock.callCount(), 0);
    }
  });
  test(`solicitud: ${role}/${status}`, async (context) => {
    const state = fixture(context, role, status);
    if (role === Role.RECEPTIONIST && status === "CONFIRMED") {
      await state.service.request(ids.appointment, { reason, role: "ADMIN", requestedById: randomUUID() }, ids.actor);
      assert.equal(state.appointment.status, "CONFIRMED");
      assert.equal(state.cancel.mock.callCount(), 0);
      const data = state.create.mock.calls[0]!.arguments[0] as { requestedById: string; activeAppointmentId: string };
      assert.equal(data.requestedById, ids.actor);
      assert.equal(data.activeAppointmentId, ids.appointment);
    } else {
      await assert.rejects(state.service.request(ids.appointment, { reason }, ids.actor));
      assert.equal(state.create.mock.callCount(), 0);
    }
  });
}

for (const role of Object.values(Role)) for (const decision of ["APPROVE", "REJECT"]) {
  test(`decisión: ${role}/${decision}`, async (context) => {
    const state = fixture(context, role);
    if (role !== Role.ADMIN) {
      await assert.rejects(state.service.review(ids.request, { decision, reason: additional }, ids.actor), AuthorizationError);
      assert.equal(state.resolve.mock.callCount(), 0);
      return;
    }
    const result = await state.service.review(ids.request, { decision, reason: additional }, ids.actor);
    assert.equal(result.state, decision === "APPROVE" ? "APPROVED" : "REJECTED");
    assert.equal(state.cancel.mock.callCount(), decision === "APPROVE" ? 1 : 0);
    const detail = state.record.mock.calls[0]!.arguments[3] as { requestReason: string; reviewReason: string; requestedBy: { id: string }; reviewedBy: { id: string } };
    assert.equal(detail.requestReason, reason);
    assert.equal(detail.reviewReason, additional);
    assert.equal(detail.requestedBy.id, ids.receptionist);
    assert.equal(detail.reviewedBy.id, ids.actor);
    const update = state.resolve.mock.calls[0]!.arguments[1] as { activeAppointmentId: string | null };
    assert.equal(update.activeAppointmentId, null);
    if (decision === "APPROVE") {
      const combined = state.cancel.mock.calls[0]!.arguments[3];
      assert.equal(combined, `Recepción: ${reason}\nAdministración: ${additional}`);
    }
  });
}

test("rechaza razones vacías/cortas/excesivas e IDs inválidos antes de escribir", async (context) => {
  const state = fixture(context);
  for (const value of ["", "   ", "a".repeat(24), "a".repeat(2001)]) {
    await assert.rejects(state.service.request(ids.appointment, { reason: value }, ids.actor));
    await assert.rejects(state.service.review(ids.request, { decision: "APPROVE", reason: value }, ids.actor));
  }
  await assert.rejects(state.service.request("invalid", { reason }, ids.actor));
  assert.equal(state.create.mock.callCount(), 0);
  assert.equal(state.resolve.mock.callCount(), 0);
});

test("bloquea solicitudes duplicadas, cuentas inactivas y citas con historia clínica", async (context) => {
  const state = fixture(context);
  state.open.mock.mockImplementation(async () => state.entry);
  await assert.rejects(state.service.request(ids.appointment, { reason }, ids.actor), DomainError);
  state.open.mock.mockImplementation(async () => null);
  state.actor.isActive = false;
  await assert.rejects(state.service.request(ids.appointment, { reason }, ids.actor), AuthorizationError);
  state.actor.isActive = true;
  state.appointment.clinicalRecord = { id: randomUUID() };
  await assert.rejects(state.service.request(ids.appointment, { reason }, ids.actor), DomainError);
  assert.equal(state.create.mock.callCount(), 0);
});

test("no aprueba una cita atendida ni resuelve dos veces; permite rechazar solicitudes obsoletas", async (context) => {
  const state = fixture(context, Role.ADMIN, "COMPLETED");
  await assert.rejects(state.service.review(ids.request, { decision: "APPROVE", reason: additional }, ids.actor), DomainError);
  assert.equal(state.cancel.mock.callCount(), 0);
  await state.service.review(ids.request, { decision: "REJECT", reason: additional }, ids.actor);
  state.entry.state = "APPROVED";
  await assert.rejects(state.service.review(ids.request, { decision: "APPROVE", reason: additional }, ids.actor), DomainError);
});

test("conflictos de estado y decisiones concurrentes no generan auditoría de éxito", async (context) => {
  const state = fixture(context, Role.ADMIN);
  state.cancel.mock.mockImplementation(async () => ({ count: 0 }));
  await assert.rejects(state.service.review(ids.request, { decision: "APPROVE", reason: additional }, ids.actor), DomainError);
  assert.equal(state.resolve.mock.callCount(), 0);
  state.resolve.mock.mockImplementation(async () => ({ count: 0 }));
  await assert.rejects(state.service.review(ids.request, { decision: "REJECT", reason: additional }, ids.actor), DomainError);
  assert.equal(state.record.mock.callCount(), 0);
});

test("reporte conserva snapshots y rellena meses sin movimientos", async (context) => {
  const state = fixture(context);
  context.mock.method(CancellationRepository.prototype, "report", async () => ({ items: [{ ...state.entry, appointment: { status: "CONFIRMED" } }], total: 1 }));
  context.mock.method(CancellationRepository.prototype, "analytics", async () => ({ summary: { requested: 1, approved: 0, rejected: 0, reassignments: 3 }, months: [] }));
  const report = await state.service.report({ page: 1, state: "REQUESTED" });
  assert.equal(report.items[0]?.requestReason, reason);
  assert.equal(report.items[0]?.requestedBy.id, ids.receptionist);
  assert.equal(report.activity.length, 6);
  assert.ok(report.activity.every((month) => month.cancellations === 0));
  await assert.rejects(state.service.report({ page: -1 }));
});
