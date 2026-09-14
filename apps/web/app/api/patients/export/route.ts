import { NextRequest } from "next/server";
import { PatientService } from "@/modules/patients/patient.service";
import { resolvePatientScope } from "@/modules/patients/patient.scope";
import { handleApiError } from "@/lib/errors";

const patientService = new PatientService();

/** GET /api/patients/export — CSV del listado filtrado completo. */
export async function GET(request: NextRequest) {
  try {
    const scope = await resolvePatientScope(request);
    const { searchParams } = new URL(request.url);

    const csv = await patientService.exportCsv({
      attendedByDentistId: scope.attendedByDentistId,
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      appointments: searchParams.get("appointments") ?? undefined,
    });

    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="pacientes-${stamp}.csv"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
