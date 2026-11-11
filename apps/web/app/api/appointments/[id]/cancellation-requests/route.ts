import { NextRequest } from "next/server";
import { Role } from "@biodentis/shared-types";
import { CancellationService } from "@/modules/appointments/cancellation.service";
import { requireRole } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";

const service = new CancellationService();

/** POST /api/appointments/[id]/cancellation-requests — request; exclusivo de RECEPTIONIST. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole(request, [Role.RECEPTIONIST]);
    const { id } = await params;
    return Response.json(await service.request(id, await request.json(), actor.sub), { status: 201 });
  } catch (error) { return handleApiError(error); }
}
