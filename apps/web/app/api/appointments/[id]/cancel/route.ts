import { NextRequest } from "next/server";
import { AppointmentService } from "@/modules/appointments/appointment.service";
import { authenticate } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";

const appointmentService = new AppointmentService();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    authenticate(request);
    const { id } = await params;
    const appointment = await appointmentService.cancel(id);
    return Response.json(appointment);
  } catch (error) {
    return handleApiError(error);
  }
}
