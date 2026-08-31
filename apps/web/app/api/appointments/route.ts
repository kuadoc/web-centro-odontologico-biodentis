import { NextRequest } from "next/server";
import { AppointmentService } from "@/modules/appointments/appointment.service";
import { authenticate } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";

const appointmentService = new AppointmentService();

export async function GET(request: NextRequest) {
  try {
    const user = authenticate(request);
    const { searchParams } = new URL(request.url);

    const filters: Record<string, string> = {};
    if (searchParams.get("status")) filters.status = searchParams.get("status")!;
    if (searchParams.get("from")) filters.from = searchParams.get("from")!;
    if (searchParams.get("to")) filters.to = searchParams.get("to")!;
    if (searchParams.get("dentistId")) filters.dentistId = searchParams.get("dentistId")!;

    if (user.role === "PATIENT") {
      filters.patientId = user.userId;
    } else if (user.role === "DENTIST") {
      filters.dentistId = user.userId;
    }

    const appointments = await appointmentService.getAll(filters);
    return Response.json(appointments);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = authenticate(request);
    const body = await request.json();
    const appointment = await appointmentService.create(body, user.userId);
    return Response.json(appointment, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
