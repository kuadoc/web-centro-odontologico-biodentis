import { NextRequest } from "next/server";
import { PatientService } from "@/modules/patients/patient.service";
import { resolvePatientScope } from "@/modules/patients/patient.scope";
import { handleApiError } from "@/lib/errors";

const patientService = new PatientService();

/** GET /api/patients/stats — KPIs del encabezado, dentro del alcance del rol. */
export async function GET(request: NextRequest) {
  try {
    const scope = await resolvePatientScope(request);
    const stats = await patientService.getStats(scope);
    return Response.json(stats);
  } catch (error) {
    return handleApiError(error);
  }
}
