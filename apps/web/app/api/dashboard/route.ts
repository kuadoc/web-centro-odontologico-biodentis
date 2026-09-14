import { NextRequest } from "next/server";
import { DashboardService } from "@/modules/dashboard/dashboard.service";
import { resolveDashboardScope } from "@/modules/dashboard/dashboard.scope";
import { handleApiError } from "@/lib/errors";

const dashboardService = new DashboardService();

/** GET /api/dashboard — KPIs del dia, tratamientos activos y alertas de insumos. */
export async function GET(request: NextRequest) {
  try {
    const scope = await resolveDashboardScope(request);
    const overview = await dashboardService.getOverview(scope);
    return Response.json(overview);
  } catch (error) {
    return handleApiError(error);
  }
}
