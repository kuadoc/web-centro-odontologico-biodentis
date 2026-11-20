import { EmailOutboxRepository } from "./email-outbox.repository";
import { AppointmentNotificationService } from "./appointment-notification.service";
import { canSendEmail } from "@/lib/email/email-policy";
import { appointmentInstant } from "@/lib/clinic-calendar";

export class EmailOutboxService {
  constructor(private readonly repository = new EmailOutboxRepository(), private readonly notifications = new AppointmentNotificationService()) {}
  async drain(appointmentId?: string, limit = 20) {
    let processed = 0;
    let failed = 0;
    for (let index = 0; index < limit; index++) {
      const job = await this.repository.claim(appointmentId);
      if (!job) break;
      let sent = false;
      let outcome = "RETRY";
      try {
        const appointment = await this.repository.appointment(job.appointmentId);
        const reminder = job.kind.startsWith("REMINDER:");
        const staleReminder = reminder && appointment && (appointment.status !== "CONFIRMED" || job.kind !== `REMINDER:${appointment.date.toISOString().slice(0, 10)}:${appointment.startTime}` || appointmentInstant(appointment.date, appointment.startTime) <= new Date());
        const obsolete = !appointment || staleReminder || (job.kind !== "CANCELLATION" && !["PENDING", "CONFIRMED"].includes(appointment.status)) || (job.kind === "CANCELLATION" && appointment.status !== "CANCELLED");
        // Contactos sin correo y destinatarios excluidos por la política son supresiones deliberadas.
        const suppressed = appointment?.patient.email.endsWith("@patients.invalid") || (appointment && !canSendEmail(appointment.patient.email));
        if (obsolete || suppressed) { sent = true; outcome = obsolete ? "OBSOLETE" : "SUPPRESSED"; }
        else {
          sent = reminder ? await this.notifications.sendReminderNotice(job.appointmentId, job.id, job.kind)
            : job.kind === "CANCELLATION" ? await this.notifications.sendCancellationNotice(job.appointmentId, job.id)
            : await this.notifications.sendBookingNotice(job.appointmentId, job.id);
          outcome = sent ? "SMTP_ACCEPTED" : "RETRY";
        }
      } catch { sent = false; }
      await this.repository.finish(job.id, job.lockedUntil, sent, job.attempts, outcome);
      processed++;
      if (!sent) failed++;
    }
    return { processed, failed };
  }
  async tryDeliver(appointmentId: string) {
    try { return await this.drain(appointmentId); }
    catch { console.error("[EMAIL_OUTBOX_DEFERRED]", { appointmentId }); return { processed: 0, failed: 1 }; }
  }
}
