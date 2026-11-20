import { NextRequest } from "next/server";
import { AppointmentService } from "@/modules/appointments/appointment.service";
import { DentistService } from "@/modules/dentists/dentist.service";
import { requireRole } from "@/lib/middleware";
import { Role } from "@biodentis/shared-types";
import { handleApiError } from "@/lib/errors";

const appointmentService = new AppointmentService();
const dentistService = new DentistService();

/** PATCH /api/appointments/[id]/complete — solo el odontólogo asignado completa su cita. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireRole(request, [Role.DENTIST]);
    const { id } = await params;
    const body = await request.json();
    const dentist = user.role === Role.DENTIST ? await dentistService.getByUserId(user.sub) : null;
    const appointment = await appointmentService.completeWithClinicalNote(id, body, {
      role: user.role,
      userId: user.sub,
      dentistId: dentist?.id,
    });
    return Response.json(appointment);
  } catch (error) {
    return handleApiError(error);
  }
}
