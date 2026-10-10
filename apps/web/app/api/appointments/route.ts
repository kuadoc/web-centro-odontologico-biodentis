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
    const user = await requireRole(request, [Role.PATIENT, Role.DENTIST, Role.ADMIN, Role.RECEPTIONIST]);
    const { searchParams } = new URL(request.url);

    const filters: Record<string, string> = {};
    if (searchParams.get("status")) filters.status = searchParams.get("status")!;
    if (searchParams.get("from")) filters.from = searchParams.get("from")!;
    if (searchParams.get("to")) filters.to = searchParams.get("to")!;
    if (searchParams.get("dentistId")) filters.dentistId = searchParams.get("dentistId")!;
    if (searchParams.get("patientId")) filters.patientId = searchParams.get("patientId")!;

    if (user.role === Role.PATIENT) {
      filters.patientId = user.sub;
    } else if (user.role === Role.DENTIST) {
      const dentist = await dentistService.getByUserId(user.sub);
      if (dentist) {
        filters.dentistId = dentist.id;
      } else {
        // Dentist sin perfil -> no ver citas
        return Response.json([]);
      }
    }
    // ADMIN y RECEPTIONIST ven todas (sin filtro adicional), salvo filtros query

    const appointments = await appointmentService.getAll(filters, user.role);
    return Response.json(appointments);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, [Role.PATIENT, Role.RECEPTIONIST, Role.ADMIN]);
    const body = await request.json();

    // RECEPTIONIST/ADMIN pueden crear cita para un paciente específico (patientId en body)
    // PATIENT solo puede crear para sí mismo (ignora patientId del body)
    let patientId = user.sub;
    if ((user.role === Role.RECEPTIONIST || user.role === Role.ADMIN) && body.patientId) {
      patientId = body.patientId;
    }

    const appointment = await appointmentService.create(body, patientId, user.role as Role);
    return Response.json(appointment, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
