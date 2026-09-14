import { NextRequest } from "next/server";
import { DashboardService } from "@/modules/dashboard/dashboard.service";
import { resolveDashboardScope } from "@/modules/dashboard/dashboard.scope";
import { handleApiError } from "@/lib/errors";

const dashboardService = new DashboardService();

/** GET /api/dashboard/waiting-room — pacientes presentes en clinica y su espera. */
export async function GET(request: NextRequest) {
  try {
    const scope = await resolveDashboardScope(request);
    const room = await dashboardService.getWaitingRoom(scope);
    return Response.json(room);
  } catch (error) {
    return handleApiError(error);
  }
}
