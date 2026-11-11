import { NextRequest } from "next/server";
import { Role } from "@biodentis/shared-types";
import { requireRole } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";
import { ReassignmentService } from "@/modules/appointments/reassignment.service";

const service = new ReassignmentService();

/** PATCH /api/appointments/[id]/reassign — ADMIN: confirmadas; RECEPTIONIST: pendientes. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole(request, [Role.ADMIN, Role.RECEPTIONIST]);
    const { id } = await params;
    const result = await service.reassign(id, await request.json(), actor.sub);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
