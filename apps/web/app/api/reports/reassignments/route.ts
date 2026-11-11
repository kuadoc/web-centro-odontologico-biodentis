import { NextRequest } from "next/server";
import { Role } from "@biodentis/shared-types";
import { requireRole } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";
import { ReassignmentService } from "@/modules/appointments/reassignment.service";

const service = new ReassignmentService();

/** GET /api/reports/reassignments — reporte de solo lectura, exclusivo de ADMIN. */
export async function GET(request: NextRequest) {
  try {
    await requireRole(request, [Role.ADMIN]);
    const query = request.nextUrl.searchParams;
    return Response.json(await service.report({ page: Number(query.get("page") ?? 1), pageSize: Number(query.get("pageSize") ?? 25) }), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error);
  }
}
