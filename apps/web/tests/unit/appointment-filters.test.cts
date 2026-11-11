import assert from "node:assert/strict";
import { test } from "node:test";
import { AppointmentStatus, Role, type Appointment } from "@biodentis/shared-types";
import { filterAppointments } from "@/lib/appointment-filters";

const user = {
  id: "patient", email: "test@example.test", role: Role.PATIENT,
  firstName: "María José", lastName: "Pérez", dni: "01234567",
  phone: null, secondaryPhone: null, avatarUrl: null, address: null,
  isActive: true, createdAt: "2030-01-01", updatedAt: "2030-01-01",
};
const template: Appointment = {
  id: "appointment", patientId: user.id, dentistId: "dentist", date: "2030-01-07T00:00:00.000Z",
  startTime: "09:00", endTime: "09:30", status: AppointmentStatus.CONFIRMED,
  notes: null, createdAt: "2030-01-01", updatedAt: "2030-01-01", patient: user,
  dentist: {
    id: "dentist", userId: "dentist-user", specialty: "General", licenseNumber: null,
    university: null, shiftLabel: null, assignedUnitId: null,
    user: { ...user, id: "dentist-user", role: Role.DENTIST, firstName: "Óscar", lastName: "Núñez", dni: null },
  },
};
const filters = { search: "", status: "" };
const ids = (appointments: Appointment[]) => appointments.map((item) => item.id);

test("busca nombre y apellidos del paciente, sin distinguir tildes, mayúsculas ni orden", () => {
  for (const search of ["maria", "PEREZ", "MARIA JOSE PEREZ", "  pérez   María  "]) {
    assert.deepEqual(ids(filterAppointments([template], { ...filters, search })), [template.id]);
  }
});

test("busca nombre y apellidos del odontólogo conservando la búsqueda anterior", () => {
  for (const search of ["oscar", "NUÑEZ", "nunez oscar"]) {
    assert.deepEqual(ids(filterAppointments([template], { ...filters, search })), [template.id]);
  }
});

test("busca DNI completo o parcial y conserva ceros iniciales", () => {
  for (const search of ["01234567", "0123", "4567"]) {
    assert.equal(filterAppointments([template], { ...filters, search }).length, 1);
  }
  assert.deepEqual(filterAppointments([template], { ...filters, search: "99999999" }), []);
});

test("un paciente sin DNI se puede encontrar por nombre sin causar errores", () => {
  const withoutDni = { ...template, patient: { ...user, dni: null } };
  assert.equal(filterAppointments([withoutDni], { ...filters, search: "maria" }).length, 1);
  assert.deepEqual(filterAppointments([withoutDni], { ...filters, search: "0123" }), []);
});

test("el rango incluye Desde y Hasta y excluye días anteriores y posteriores", () => {
  const appointments = ["06", "07", "08", "09", "10"].map((day) => ({ ...template, id: day, date: `2030-01-${day}T00:00:00.000Z` }));
  assert.deepEqual(ids(filterAppointments(appointments, { ...filters, from: "2030-01-07", to: "2030-01-09" })), ["07", "08", "09"]);
});

test("permite filtrar un solo día y conserva el día civil del ISO UTC", () => {
  for (const date of ["2030-01-07", "2030-01-07T00:00:00.000Z"]) {
    assert.equal(filterAppointments([{ ...template, date }], { ...filters, from: "2030-01-07", to: "2030-01-07" }).length, 1);
  }
});

test("fecha, estado y búsqueda se combinan mediante intersección", () => {
  const appointments = [
    template,
    { ...template, id: "cancelled", status: AppointmentStatus.CANCELLED },
    { ...template, id: "outside", date: "2030-01-08T00:00:00.000Z" },
    { ...template, id: "other", patient: { ...user, dni: "88888888" } },
  ];
  assert.deepEqual(ids(filterAppointments(appointments, {
    search: "01234567", status: "CONFIRMED", from: "2030-01-07", to: "2030-01-07",
  })), [template.id]);
});

test("limpiar filtros recupera el listado autorizado en el mismo orden sin modificarlo", () => {
  const appointments = [template, { ...template, id: "second", status: AppointmentStatus.PENDING }];
  const snapshot = structuredClone(appointments);
  assert.deepEqual(filterAppointments(appointments, filters), appointments);
  assert.deepEqual(appointments, snapshot);
  assert.deepEqual(filterAppointments(appointments, { ...filters, search: "inexistente" }), []);
});

test("rango invertido no devuelve resultados y permite mostrar el error del selector", () => {
  assert.deepEqual(filterAppointments([template], { ...filters, from: "2030-01-09", to: "2030-01-07" }), []);
});

test("filtrado no incorpora registros adicionales y omite relaciones ausentes", () => {
  assert.deepEqual(filterAppointments([], { ...filters, search: "maria" }), []);
  assert.deepEqual(filterAppointments([{ ...template, patient: undefined }, { ...template, dentist: undefined }], filters), []);
});
