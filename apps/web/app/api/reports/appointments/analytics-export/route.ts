import { NextRequest } from "next/server";
import { Role } from "@biodentis/shared-types";
import { requireRole } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";
import { AppointmentAnalyticsExportService } from "@/modules/reports/appointment-analytics-export.service";

export const runtime = "nodejs";
/** GET /api/reports/appointments/analytics-export — Excel por período y odontólogo, con alcance propio del paciente. */
export async function GET(request: NextRequest) {
  try {
    const actor = await requireRole(request, [Role.ADMIN, Role.PATIENT]);
    const file = await new AppointmentAnalyticsExportService().exportXlsx(Object.fromEntries(request.nextUrl.searchParams), { id: actor.sub, role: actor.role });
    return new Response(file.content, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${file.filename}"`, "Cache-Control": "private, no-store" } });
  } catch (error) { return handleApiError(error); }
}
