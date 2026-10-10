import { NextRequest } from "next/server";
import { AppointmentService } from "@/modules/appointments/appointment.service";
import { DentistService } from "@/modules/dentists/dentist.service";
import { requireRole } from "@/lib/middleware";
import { Role } from "@biodentis/shared-types";
import { handleApiError } from "@/lib/errors";

const appointmentService = new AppointmentService();
const dentistService = new DentistService();

/** PATCH /api/appointments/[id]/complete — el odontólogo dueño registra diagnóstico y tratamiento y completa la cita. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireRole(request, [Role.DENTIST]);
    const { id } = await params;
    const body = await request.json();
    const dentist = await dentistService.getByUserId(user.sub);
    const appointment = await appointmentService.completeWithClinicalNote(id, body, { dentistId: dentist?.id });
    return Response.json(appointment);
  } catch (error) {
    return handleApiError(error);
  }
}
