import { NextRequest } from "next/server";
import { DashboardService } from "@/modules/dashboard/dashboard.service";
import { resolveDashboardScope } from "@/modules/dashboard/dashboard.scope";
import { handleApiError } from "@/lib/errors";

const dashboardService = new DashboardService();

/**
 * PATCH /api/appointments/[id]/check-in — registra la llegada del paciente.
 * Un DENTIST solo puede hacerlo sobre citas de su propia agenda.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const scope = await resolveDashboardScope(request);
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { priority?: "NORMAL" | "URGENT" | "EMERGENCY" };
    const updated = await dashboardService.checkIn(id, body.priority, scope.dentistId);
    return Response.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
