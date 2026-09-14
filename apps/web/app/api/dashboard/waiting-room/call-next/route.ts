import { NextRequest } from "next/server";
import { DashboardService } from "@/modules/dashboard/dashboard.service";
import { resolveDashboardScope } from "@/modules/dashboard/dashboard.scope";
import { handleApiError } from "@/lib/errors";

const dashboardService = new DashboardService();

/** POST /api/dashboard/waiting-room/call-next — llama al siguiente paciente en espera. */
export async function POST(request: NextRequest) {
  try {
    const scope = await resolveDashboardScope(request);
    const called = await dashboardService.callNext(scope);
    if (!called) {
      return Response.json({ called: null, message: "No hay pacientes en espera" });
    }
    return Response.json({ called });
  } catch (error) {
    return handleApiError(error);
  }
}
