import { NextRequest } from "next/server";
import { AppointmentService } from "@/modules/appointments/appointment.service";
import { requireRole } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";
import { Role } from "@biodentis/shared-types";
import { sendAppointmentConfirmation } from "@/lib/email/send-emails";

const appointmentService = new AppointmentService();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(request, [Role.RECEPTIONIST, Role.ADMIN]);
    const { id } = await params;
    const appointment = await appointmentService.confirm(id);

    const fullAppointment = await appointmentService.getById(id);

    const patientEmail = fullAppointment.patient.email;
    const patientName = `${fullAppointment.patient.firstName} ${fullAppointment.patient.lastName}`;
    const dentistName = `Dr. ${fullAppointment.dentist.user.firstName} ${fullAppointment.dentist.user.lastName}`;
    const date = new Date(fullAppointment.date).toLocaleDateString("es-CL");
    const time = fullAppointment.startTime;

    sendAppointmentConfirmation(patientEmail, {
      patientName,
      dentistName,
      date,
      time,
    }).catch((error) => {
      console.error("[APPOINTMENT_CONFIRM_EMAIL_FAILED]", { appointmentId: id, error });
    });

    return Response.json(appointment);
  } catch (error) {
    return handleApiError(error);
  }
}
