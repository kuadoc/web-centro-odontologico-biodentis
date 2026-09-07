import { NextRequest } from "next/server";
import { AppointmentService } from "@/modules/appointments/appointment.service";
import { requireRole } from "@/lib/middleware";
import { Role } from "@biodentis/shared-types";
import { handleApiError } from "@/lib/errors";

const appointmentService = new AppointmentService();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(request, [Role.DENTIST, Role.RECEPTIONIST]);
    const { id } = await params;
    const body = await request.json();
    const appointment = await appointmentService.updateStatus(id, body);
    return Response.json(appointment);
  } catch (error) {
    return handleApiError(error);
  }
}
