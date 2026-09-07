import { NextRequest } from "next/server";
import { AppointmentService } from "@/modules/appointments/appointment.service";
import { DentistService } from "@/modules/dentists/dentist.service";
import { requireRole } from "@/lib/middleware";
import { Role } from "@biodentis/shared-types";
import { handleApiError } from "@/lib/errors";

const appointmentService = new AppointmentService();
const dentistService = new DentistService();

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(request, [Role.PATIENT, Role.DENTIST, Role.ADMIN]);
    const { searchParams } = new URL(request.url);

    const filters: Record<string, string> = {};
    if (searchParams.get("status")) filters.status = searchParams.get("status")!;
    if (searchParams.get("from")) filters.from = searchParams.get("from")!;
    if (searchParams.get("to")) filters.to = searchParams.get("to")!;
    if (searchParams.get("dentistId")) filters.dentistId = searchParams.get("dentistId")!;

    if (user.role === "PATIENT") {
      filters.patientId = user.sub;
    } else if (user.role === "DENTIST") {
      const dentist = await dentistService.getByUserId(user.sub);
      if (dentist) {
        filters.dentistId = dentist.id;
      }
    }

    const appointments = await appointmentService.getAll(filters);
    return Response.json(appointments);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, [Role.PATIENT, Role.RECEPTIONIST, Role.ADMIN]);
    const body = await request.json();
    const appointment = await appointmentService.create(body, user.sub);
    return Response.json(appointment, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
