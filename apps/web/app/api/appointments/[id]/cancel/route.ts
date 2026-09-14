import { NextRequest } from "next/server";
import { AppointmentService } from "@/modules/appointments/appointment.service";
import { requireRole } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";
import { Role } from "@biodentis/shared-types";
import { sendAppointmentCancelled } from "@/lib/email/send-emails";

const appointmentService = new AppointmentService();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(request, [Role.PATIENT, Role.DENTIST, Role.RECEPTIONIST, Role.ADMIN]);
    const { id } = await params;

    const fullAppointment = await appointmentService.getById(id);
    const appointment = await appointmentService.cancel(id);

    const patientEmail = fullAppointment.patient.email;
    const patientName = `${fullAppointment.patient.firstName} ${fullAppointment.patient.lastName}`;
    const dentistName = `Dr. ${fullAppointment.dentist.user.firstName} ${fullAppointment.dentist.user.lastName}`;
    const date = new Date(fullAppointment.date).toLocaleDateString("es-CL");
    const time = fullAppointment.startTime;

    sendAppointmentCancelled(patientEmail, {
      patientName,
      dentistName,
      date,
      time,
    }).catch((error) => {
      console.error("[APPOINTMENT_CANCEL_EMAIL_FAILED]", { appointmentId: id, error });
    });

    return Response.json(appointment);
  } catch (error) {
    return handleApiError(error);
  }
}
