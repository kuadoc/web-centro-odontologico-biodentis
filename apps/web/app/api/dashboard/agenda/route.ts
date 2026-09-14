import { NextRequest } from "next/server";
import { DashboardService } from "@/modules/dashboard/dashboard.service";
import { resolveDashboardScope } from "@/modules/dashboard/dashboard.scope";
import { handleApiError } from "@/lib/errors";

const dashboardService = new DashboardService();

/** GET /api/dashboard/agenda — citas del dia paginadas, filtrables por estado. */
export async function GET(request: NextRequest) {
  try {
    const scope = await resolveDashboardScope(request);
    const { searchParams } = new URL(request.url);

    const agenda = await dashboardService.getAgenda({
      ...scope,
      status: searchParams.get("status") ?? undefined,
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 5),
    });
    return Response.json(agenda);
  } catch (error) {
    return handleApiError(error);
  }
}
