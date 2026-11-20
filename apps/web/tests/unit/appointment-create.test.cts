import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { ZodError } from "zod";
import { Role } from "@biodentis/shared-types";
import { AppointmentService } from "@/modules/appointments/appointment.service";
import { AppointmentRepository } from "@/modules/appointments/appointment.repository";
import { EmailOutboxService } from "@/modules/appointments/email-outbox.service";
import { AvailabilityService } from "@/modules/availability/availability.service";
import { CatalogAdminService } from "@/modules/service-catalog/catalog-admin.service";
import { AuthorizationError, DomainError, ScheduleConflictError, ValidationError } from "@/lib/errors";

const PATIENT = "11111111-1111-4111-8111-111111111111";
const SELECTED_PATIENT = "22222222-2222-4222-8222-222222222222";
const DENTIST = "33333333-3333-4333-8333-333333333333";
const TREATMENT = "44444444-4444-4444-8444-444444444444";
const ACTOR = "55555555-5555-4555-8555-555555555555";
const input = {
  patientId: SELECTED_PATIENT, dentistId: DENTIST, treatmentId: TREATMENT,
  reason: "Dolor dental", hasPain: true, problemDuration: "Una semana", date: "2030-01-07", startTime: "09:00", endTime: "09:30", notes: "  Dolor en una muela  ",
};

function setup(context: TestContext) {
  const events: string[] = [];
  // Se simulan las fronteras del servicio, sin acceder a BD ni enviar correos.
  const catalog = context.mock.method(CatalogAdminService.prototype, "requireBookable", async () => {
    events.push("catalog");
    return { id: TREATMENT, durationMinutes: 45 };
  });
  const availability = context.mock.method(AvailabilityService.prototype, "getAvailableSlots", async () => {
    events.push("availability");
    return [{ startTime: "09:00", endTime: "09:45" }];
  });
  const conflict = context.mock.method(AppointmentRepository.prototype, "findConflicting", async () => {
    events.push("conflict");
    return null;
  });
  const create = context.mock.method(AppointmentRepository.prototype, "create", async (data: unknown) => {
    events.push("create");
    return { id: "created-appointment", ...(data as Record<string, unknown>) };
  });
  const notice = context.mock.method(EmailOutboxService.prototype, "tryDeliver", async () => {
    events.push("notice");
    return true;
  });
  return { service: new AppointmentService(), events, catalog, availability, conflict, create, notice };
}

for (const role of [Role.PATIENT, Role.RECEPTIONIST, Role.ADMIN, undefined]) {
  test(`CITA-01 | creación como ${role ?? "sin rol"}: paciente, estado, horario y efectos`, async (context) => {
    const { service, events, catalog, availability, conflict, create, notice } = setup(context);
    const result = await service.create({ ...input, status: "CANCELLED", actorRole: "RECEPTIONIST" }, PATIENT, role, ACTOR);
    const saved = {
      patientId: role === Role.ADMIN || role === Role.RECEPTIONIST ? SELECTED_PATIENT : PATIENT,
      dentistId: DENTIST, date: new Date(input.date), startTime: "09:00", endTime: "09:45",
      notes: role === Role.PATIENT ? "Motivo: Dolor dental\nDolor: Sí\nTiempo del problema: Una semana\nNotas: Dolor en una muela" : "Dolor en una muela", treatmentId: TREATMENT,
      status: role === Role.RECEPTIONIST ? "CONFIRMED" : "PENDING",
    };
    assert.deepEqual(create.mock.calls[0]?.arguments, [saved, role === Role.RECEPTIONIST ? ACTOR : undefined]);
    assert.deepEqual(result, { id: "created-appointment", ...saved });
    assert.deepEqual(catalog.mock.calls[0]?.arguments, [TREATMENT, DENTIST]);
    assert.deepEqual(availability.mock.calls[0]?.arguments, [DENTIST, input.date, TREATMENT]);
    assert.deepEqual(conflict.mock.calls[0]?.arguments, [DENTIST, new Date(input.date), "09:00", undefined, "09:45"]);
    assert.deepEqual(notice.mock.calls[0]?.arguments, [result.id]);
    assert.deepEqual(events, ["catalog", "availability", "conflict", "create", "notice"]);
  });
}

for (const role of [Role.ADMIN, undefined]) {
  test(`CITA-02 | sin tratamiento como ${role ?? "sin rol"}: conserva horario directo`, async (context) => {
    const { service, events, create } = setup(context);
    const result = await service.create({ ...input, treatmentId: undefined }, PATIENT, role);
    assert.equal(result.endTime, input.endTime);
    assert.equal(create.mock.calls[0]?.arguments[1], undefined);
    assert.deepEqual(events, ["conflict", "create", "notice"]);
  });
}

const actorErrors = [
  { role: Role.RECEPTIONIST, data: { ...input, patientId: undefined, treatmentId: undefined }, actor: undefined, error: ValidationError, message: "Selecciona el paciente para quien se registrará la cita." },
  { role: Role.ADMIN, data: { ...input, patientId: undefined }, actor: ACTOR, error: ValidationError, message: "Selecciona el paciente para quien se registrará la cita." },
  { role: Role.RECEPTIONIST, data: { ...input, treatmentId: undefined }, actor: undefined, error: AuthorizationError, message: "No se pudo identificar al responsable de la confirmación." },
  { role: Role.RECEPTIONIST, data: { ...input, treatmentId: undefined }, actor: ACTOR, error: ValidationError, message: "Selecciona el servicio que deseas reservar." },
  { role: Role.PATIENT, data: { ...input, treatmentId: undefined }, actor: ACTOR, error: ValidationError, message: "Selecciona el servicio que deseas reservar." },
];
for (const [index, scenario] of actorErrors.entries()) {
  test(`CITA-03 | reglas de actor y prioridad del error (${index + 1})`, async (context) => {
    const { service, events } = setup(context);
    await assert.rejects(service.create(scenario.data, PATIENT, scenario.role, scenario.actor), (error: unknown) => {
      assert.ok(error instanceof scenario.error);
      assert.equal(error.message, scenario.message);
      return true;
    });
    assert.deepEqual(events, []);
  });
}

for (const data of [{ ...input, dentistId: "invalid" }, { ...input, notes: "dolor" }]) {
  test("CITA-04 | Zod rechaza antes de consultar catálogo, agenda o persistencia", async (context) => {
    const { service, events } = setup(context);
    await assert.rejects(service.create(data, PATIENT, Role.RECEPTIONIST), ZodError);
    assert.deepEqual(events, []);
  });
}

test("CITA-05 | tratamiento no reservable: propaga el error antes de consultar agenda", async (context) => {
  const { service, catalog, events } = setup(context);
  const failure = new DomainError("Servicio no reservable", 409);
  catalog.mock.mockImplementation(async () => { events.push("catalog"); throw failure; });
  await assert.rejects(service.create(input, PATIENT, Role.PATIENT), (error) => error === failure);
  assert.deepEqual(events, ["catalog"]);
});

test("CITA-06 | sin bloque con el inicio solicitado: conflicto y ninguna escritura", async (context) => {
  const { service, availability, events } = setup(context);
  availability.mock.mockImplementation(async () => {
    events.push("availability");
    return [{ startTime: "10:00", endTime: "10:45" }];
  });
  await assert.rejects(service.create(input, PATIENT, Role.PATIENT), {
    name: ScheduleConflictError.name, message: "El horario seleccionado ya no esta disponible",
  });
  assert.deepEqual(events, ["catalog", "availability"]);
});

test("CITA-07 | el bloque de agenda reemplaza una hora final del cliente anterior al inicio", async (context) => {
  const { service } = setup(context);
  const result = await service.create({ ...input, endTime: "08:00" }, PATIENT, Role.PATIENT);
  assert.equal(result.endTime, "09:45");
});

test("CITA-08 | rango directo inválido: rechaza antes de consultar conflictos", async (context) => {
  const { service, events } = setup(context);
  await assert.rejects(service.create({ ...input, treatmentId: undefined, endTime: "08:00" }, PATIENT, Role.ADMIN), {
    name: ValidationError.name, message: "Rango de horario inválido",
  });
  assert.deepEqual(events, []);
});

test("CITA-09 | cruce detectado: conserva error y no guarda ni notifica", async (context) => {
  const { service, conflict, events } = setup(context);
  conflict.mock.mockImplementation(async () => { events.push("conflict"); return { id: "occupied" }; });
  await assert.rejects(service.create(input, PATIENT, Role.PATIENT), {
    name: ScheduleConflictError.name, message: "El odontólogo ya tiene una cita en ese horario",
  });
  assert.deepEqual(events, ["catalog", "availability", "conflict"]);
});

for (const stage of ["availability", "conflict", "create", "notice"] as const) {
  test(`CITA-10 | fallo en ${stage}: propaga el mismo error y detiene efectos posteriores`, async (context) => {
    const fixture = setup(context);
    const failure = new Error(`Fallo simulado: ${stage}`);
    fixture[stage].mock.mockImplementation(async () => { fixture.events.push(stage); throw failure; });
    await assert.rejects(fixture.service.create(input, PATIENT, Role.PATIENT), (error) => error === failure);
    const ordered = ["catalog", "availability", "conflict", "create", "notice"];
    assert.deepEqual(fixture.events, ordered.slice(0, ordered.indexOf(stage) + 1));
    assert.equal(fixture.create.mock.callCount(), stage === "create" || stage === "notice" ? 1 : 0);
  });
}

test("CITA-11 | notificación devuelve false: conserva la cita guardada y no reintenta", async (context) => {
  const { service, notice, create } = setup(context);
  notice.mock.mockImplementation(async () => false);
  const result = await service.create(input, PATIENT, Role.PATIENT);
  assert.equal(result.id, "created-appointment");
  assert.equal(create.mock.callCount(), 1);
  assert.equal(notice.mock.callCount(), 1);
});

test("CITA-12 | no modifica el objeto del cliente al resolver el horario", async (context) => {
  const { service } = setup(context);
  const original = { ...input };
  await service.create(original, PATIENT, Role.PATIENT);
  assert.deepEqual(original, input);
});
