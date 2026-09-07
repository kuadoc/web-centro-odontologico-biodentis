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
    await requireRole(request, [Role.PATIENT, Role.DENTIST, Role.RECEPTIONIST, Role.ADMIN]);
    const { id } = await params;
    const body = await request.json();
    const appointment = await appointmentService.reschedule(id, body);
    return Response.json(appointment);
  } catch (error) {
    return handleApiError(error);
  }
}
