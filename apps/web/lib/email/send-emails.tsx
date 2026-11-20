import { sendEmail } from "./send-email";
import { emailFrontendUrl } from "@/lib/env";
import ResetPasswordEmail from "@/emails/reset-password";
import WelcomeEmail from "@/emails/welcome";
import AppointmentConfirmationEmail from "@/emails/appointment-confirmation";
import AppointmentReminderEmail from "@/emails/appointment-reminder";
import AppointmentCancelledEmail from "@/emails/appointment-cancelled";

export async function sendPasswordResetEmail(
  to: string,
  userName: string,
  token: string
): Promise<boolean> {
  const resetLink = `${emailFrontendUrl()}/reset-password?token=${token}`;

  return sendEmail({
    to,
    subject: "Restablece tu contraseña - BIODENTIS",
    react: ResetPasswordEmail({ userName, resetLink }),
    type: "password_reset",
  });
}

export async function sendWelcomeEmail(
  to: string,
  userName: string
): Promise<boolean> {
  return sendEmail({
    to,
    subject: "¡Bienvenido a BIODENTIS!",
    react: WelcomeEmail({ userName }),
    type: "welcome",
  });
}

export async function sendAppointmentConfirmation(
  to: string,
  data: {
    patientName: string;
    dentistName: string;
    date: string;
    time: string;
    serviceName?: string;
    specialtyName?: string;
  }
): Promise<boolean> {
  return sendEmail({
    to,
    subject: "Cita confirmada - BIODENTIS",
    react: AppointmentConfirmationEmail({ ...data, clinicName: "BIODENTIS" }),
    type: "appointment_confirmation",
  });
}

export async function sendAppointmentRegistration(
  to: string,
  data: {
    patientName: string;
    dentistName: string;
    date: string;
    time: string;
    serviceName: string;
    specialtyName: string;
    status: "PENDING" | "CONFIRMED";
  },
  idempotencyKey?: string
): Promise<boolean> {
  const confirmed = data.status === "CONFIRMED";
  return sendEmail({
    to,
    subject: confirmed ? "Cita confirmada - BIODENTIS" : "Cita registrada, pendiente de confirmación - BIODENTIS",
    react: AppointmentConfirmationEmail({ ...data, clinicName: "BIODENTIS" }),
    type: confirmed ? "appointment_confirmation" : "appointment_registration",
    idempotencyKey,
  });
}

export async function sendAppointmentReminder(
  to: string,
  data: {
    patientName: string;
    dentistName: string;
    date: string;
    time: string;
  },
  idempotencyKey?: string
): Promise<boolean> {
  return sendEmail({
    to,
    subject: "Recordatorio de cita - BIODENTIS",
    react: AppointmentReminderEmail({ ...data, clinicName: "BIODENTIS" }),
    type: "appointment_reminder",
    idempotencyKey,
  });
}

export async function sendAppointmentCancelled(
  to: string,
  data: {
    patientName: string;
    dentistName: string;
    date: string;
    time: string;
    reason?: string;
  },
  idempotencyKey?: string
): Promise<boolean> {
  return sendEmail({
    to,
    subject: "Cita cancelada - BIODENTIS",
    react: AppointmentCancelledEmail({ ...data, clinicName: "BIODENTIS" }),
    type: "appointment_cancelled",
    idempotencyKey,
  });
}
