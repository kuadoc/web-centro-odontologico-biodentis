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
    const body = await request.json();
    const appointment = await appointmentService.reschedule(id, body);
    return Response.json(appointment);
  } catch (error) {
    return handleApiError(error);
  }
}
