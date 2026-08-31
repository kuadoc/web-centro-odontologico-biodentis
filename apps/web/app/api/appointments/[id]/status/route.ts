import { NextRequest } from "next/server";
import { AppointmentService } from "@/modules/appointments/appointment.service";
import { authenticate } from "@/lib/middleware";
import { Role } from "@workspace/shared-validators";
import { handleApiError } from "@/lib/errors";

const appointmentService = new AppointmentService();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = authenticate(request);
    if (user.role !== Role.DENTIST && user.role !== Role.RECEPTIONIST) {
      return Response.json({ error: "Sin permisos" }, { status: 403 });
    }
    const { id } = await params;
    const body = await request.json();
    const appointment = await appointmentService.updateStatus(id, body);
    return Response.json(appointment);
  } catch (error) {
    return handleApiError(error);
  }
}
