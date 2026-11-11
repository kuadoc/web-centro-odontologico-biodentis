import { NextRequest } from "next/server";
import { Role } from "@biodentis/shared-types";
import { CancellationService } from "@/modules/appointments/cancellation.service";
import { requireRole } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";

const service = new CancellationService();
/** GET /api/reports/cancellations — solicitudes, decisiones y métricas; ADMIN. */
export async function GET(request: NextRequest) {
  try {
    await requireRole(request, [Role.ADMIN]);
    const query = request.nextUrl.searchParams;
    return Response.json(await service.report({ page: Number(query.get("page") ?? 1), pageSize: Number(query.get("pageSize") ?? 25), state: query.get("state") || undefined }), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return handleApiError(error); }
}
