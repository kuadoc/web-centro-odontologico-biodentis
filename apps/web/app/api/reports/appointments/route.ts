import { NextRequest } from "next/server";
import { Role } from "@biodentis/shared-types";
import { requireRole } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";
import { AppointmentReportService } from "@/modules/reports/appointment-report.service";

/** GET /api/reports/appointments — actividad de la clínica para ADMIN; datos propios para PATIENT. */
export async function GET(request: NextRequest) {
  try {
    const actor = await requireRole(request, [Role.ADMIN, Role.PATIENT]);
    const data = await new AppointmentReportService().report(Object.fromEntries(request.nextUrl.searchParams), { id: actor.sub, role: actor.role });
    return Response.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return handleApiError(error); }
}
