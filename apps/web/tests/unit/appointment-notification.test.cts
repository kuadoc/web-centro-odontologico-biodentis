import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppointmentRepository } from "@/modules/appointments/appointment.repository";
import { AppointmentNotificationService } from "@/modules/appointments/appointment-notification.service";
import AppointmentEmail from "@/emails/appointment-confirmation";
import type { sendAppointmentRegistration } from "@/lib/email/send-emails";

type Notice = Parameters<typeof sendAppointmentRegistration>[1];
const expected = {
  patientName: "Sofía Rivas", dentistName: "Carlos Mendoza", date: "20/11/2026", time: "16:00",
  serviceName: "Evaluación dental", specialtyName: "Odontología general",
};

for (const status of ["PENDING", "CONFIRMED"] as const) {
  test(`correo ${status}: destinatario real de la cita, fecha civil y datos completos de atención`, async (context) => {
    const repository = new AppointmentRepository();
    context.mock.method(repository, "findById", async () => ({
      status, date: new Date("2026-11-20T00:00:00.000Z"), startTime: "16:00:45.987",
      patient: { email: "paciente@example.com", firstName: "Sofía", lastName: "Rivas" },
      dentist: { user: { firstName: "Carlos", lastName: "Mendoza" } },
      treatment: { name: expected.serviceName, category: "General", specialty: { name: expected.specialtyName } },
    }));
    const sent: { to: string; data: Notice }[] = [];
    const sender = async (to: string, data: Notice) => {
      sent.push({ to, data });
      return true;
    };
    assert.equal(await new AppointmentNotificationService(repository, sender).sendBookingNotice("appointment"), true);
    assert.equal(sent.length, 1);
    assert.equal(sent[0]?.to, "paciente@example.com");
    assert.deepEqual(sent[0]?.data, { ...expected, status });
    const html = renderToStaticMarkup(createElement(AppointmentEmail, { ...sent[0]!.data, clinicName: "BIODENTIS" }));
    for (const value of [expected.patientName, expected.dentistName, expected.date, expected.time, expected.serviceName, expected.specialtyName]) assert.ok(html.includes(value), value);
    assert.equal(html.includes("2026-11-20T"), false);
    assert.equal(html.includes("16:00:45"), false);
    assert.ok(html.includes(status === "CONFIRMED" ? "Cita confirmada" : "Pendiente de confirmación"));
    if (status === "PENDING") assert.equal(html.includes("ha sido confirmada exitosamente"), false);
  });
}

test("un fallo de correo no se propaga como fallo de reserva ni provoca un segundo guardado", async (context) => {
  const repository = new AppointmentRepository();
  context.mock.method(repository, "findById", async () => ({ status: "PENDING", patient: { email: "paciente@example.com", firstName: "Sofía", lastName: "Rivas" }, dentist: { user: { firstName: "Carlos", lastName: "Mendoza" } }, date: new Date("2026-11-20"), startTime: "16:00", treatment: null }));
  context.mock.method(console, "error", () => {});
  const write = context.mock.method(repository, "create", async () => { throw new Error("No debe volver a guardar"); });
  const sender = async () => { throw new Error("Proveedor no disponible"); };
  assert.equal(await new AppointmentNotificationService(repository, sender).sendBookingNotice("appointment"), false);
  assert.equal(write.mock.callCount(), 0);
});

test("no envía avisos de reserva para citas inexistentes o canceladas", async (context) => {
  const repository = new AppointmentRepository();
  const read = context.mock.method(repository, "findById", async () => null);
  const sender = context.mock.fn(async () => true);
  const service = new AppointmentNotificationService(repository, sender);
  assert.equal(await service.sendBookingNotice("missing"), false);
  read.mock.mockImplementation(async () => ({ status: "CANCELLED" }));
  assert.equal(await service.sendBookingNotice("cancelled"), false);
  assert.equal(sender.mock.callCount(), 0);
});
