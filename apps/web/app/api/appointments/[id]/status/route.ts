import { NextRequest } from "next/server";
import { AppointmentService } from "@/modules/appointments/appointment.service";
import { requireRole } from "@/lib/middleware";
import { Role } from "@biodentis/shared-types";
import { handleApiError } from "@/lib/errors";
import { DentistService } from "@/modules/dentists/dentist.service";

const appointmentService = new AppointmentService();
const dentistService = new DentistService();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireRole(request, [Role.DENTIST, Role.RECEPTIONIST]);
    const { id } = await params;
    const body = await request.json();
    const dentist = user.role === Role.DENTIST ? await dentistService.getByUserId(user.sub) : null;
    const appointment = await appointmentService.updateStatus(id, body, {
      role: user.role as Role,
      dentistId: dentist?.id,
    });
    return Response.json(appointment);
  } catch (error) {
    return handleApiError(error);
  }
}
