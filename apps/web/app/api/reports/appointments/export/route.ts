import { NextRequest } from "next/server";
import { Role } from "@biodentis/shared-types";
import { requireRole } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";
import { AppointmentReportExportService } from "@/modules/appointments/appointment-report-export.service";

export const runtime = "nodejs";
const service = new AppointmentReportExportService();

/** GET /api/reports/appointments/export — Excel del reporte completo filtrado; ADMIN. */
export async function GET(request: NextRequest) {
  try {
    const { sub: actorId } = await requireRole(request, [Role.ADMIN]);
    const file = await service.exportXlsx({ state: request.nextUrl.searchParams.get("state") || undefined }, actorId);
    return new Response(file.content, { headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${file.filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) {
    const response = handleApiError(error);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
}
