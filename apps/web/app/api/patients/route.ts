import { NextRequest } from "next/server";
import { PatientService } from "@/modules/patients/patient.service";
import { resolvePatientScope, requirePatientAdmin } from "@/modules/patients/patient.scope";
import { handleApiError } from "@/lib/errors";

const patientService = new PatientService();

/** GET /api/patients — directorio paginado, filtrado y acotado por rol. */
export async function GET(request: NextRequest) {
  try {
    const scope = await resolvePatientScope(request);
    const { searchParams } = new URL(request.url);

    const result = await patientService.list({
      attendedByDentistId: scope.attendedByDentistId,
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      appointments: searchParams.get("appointments") ?? undefined,
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 10),
    });
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

/** POST /api/patients — alta de paciente. Solo ADMIN y RECEPTIONIST. */
export async function POST(request: NextRequest) {
  try {
    const { actorId } = await requirePatientAdmin(request);
    const body = await request.json();
    const patient = await patientService.create(body, actorId);
    return Response.json(patient, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
