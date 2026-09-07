import { NextRequest } from "next/server";
import { AppointmentService } from "@/modules/appointments/appointment.service";
import { requireRole } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";
import { Role } from "@biodentis/shared-types";

const appointmentService = new AppointmentService();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(request, [Role.DENTIST, Role.RECEPTIONIST, Role.ADMIN]);
    const { id } = await params;
    const appointment = await appointmentService.confirm(id);
    return Response.json(appointment);
  } catch (error) {
    return handleApiError(error);
  }
}
