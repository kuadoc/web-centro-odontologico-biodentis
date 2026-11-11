import { formatCalendarDate, formatTime } from "@workspace/ui/lib/utils";
import type { sendAppointmentRegistration } from "@/lib/email/send-emails";
import { AppointmentRepository } from "./appointment.repository";

type Notice = Parameters<typeof sendAppointmentRegistration>[1];

async function deliver(to: string, data: Notice) {
  const { sendAppointmentRegistration } = await import("@/lib/email/send-emails");
  return sendAppointmentRegistration(to, data);
}

export class AppointmentNotificationService {
  constructor(private readonly repository = new AppointmentRepository(), private readonly send = deliver) {}

  /** Solo después del commit; una solicitud pendiente nunca envía un aviso de cancelación. */
  async sendCancellationNotice(id: string): Promise<boolean> {
    try {
      const appointment = await this.repository.findById(id);
      if (!appointment || appointment.status !== "CANCELLED") return false;
      const { sendAppointmentCancelled } = await import("@/lib/email/send-emails");
      return await sendAppointmentCancelled(appointment.patient.email, {
        patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
        dentistName: `${appointment.dentist.user.firstName} ${appointment.dentist.user.lastName}`,
        date: formatCalendarDate(appointment.date), time: formatTime(appointment.startTime),
        reason: appointment.cancellationReason ?? undefined,
      });
    } catch {
      console.error("[CANCELLATION_NOTICE_FAILED]", { appointmentId: id });
      return false;
    }
  }

  /** Se ejecuta después del commit: un fallo de correo no debe duplicar una reserva. */
  async sendBookingNotice(id: string): Promise<boolean> {
    try {
      const appointment = await this.repository.findById(id);
      if (!appointment || !["PENDING", "CONFIRMED"].includes(appointment.status)) return false;
      return await this.send(appointment.patient.email, {
        patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
        dentistName: `${appointment.dentist.user.firstName} ${appointment.dentist.user.lastName}`,
        date: formatCalendarDate(appointment.date),
        time: formatTime(appointment.startTime),
        serviceName: appointment.treatment?.name ?? "Atención odontológica",
        specialtyName: appointment.treatment?.specialty?.name ?? appointment.treatment?.category ?? "Odontología general",
        status: appointment.status === "CONFIRMED" ? "CONFIRMED" : "PENDING",
      });
    } catch {
      console.error("[APPOINTMENT_NOTICE_FAILED]", { appointmentId: id });
      return false;
    }
  }
}
