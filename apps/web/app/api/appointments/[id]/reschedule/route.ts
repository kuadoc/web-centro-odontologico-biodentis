import { NextRequest } from "next/server";
import { AppointmentService } from "@/modules/appointments/appointment.service";
import { requireRole } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";
import { Role } from "@biodentis/shared-types";

const appointmentService = new AppointmentService();

/** PATCH /api/appointments/[id]/reschedule — Recepción, ADMIN o paciente propietario. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireRole(request, [Role.PATIENT, Role.RECEPTIONIST, Role.ADMIN]);
    const { id } = await params;
    const body = await request.json();
    const appointment = await appointmentService.reschedule(id, body, { userId: actor.sub, role: actor.role });
    return Response.json(appointment);
  } catch (error) {
    return handleApiError(error);
  }
}
