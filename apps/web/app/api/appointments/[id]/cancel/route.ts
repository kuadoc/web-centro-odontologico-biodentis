import { NextRequest } from "next/server";
import { Role } from "@biodentis/shared-types";
import { AppointmentNotificationService } from "@/modules/appointments/appointment-notification.service";
import { CancellationService } from "@/modules/appointments/cancellation.service";
import { requireRole } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";

const service = new CancellationService();

/** PATCH /api/appointments/[id]/cancel — cancel; exclusivo de RECEPTIONIST. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole(request, [Role.RECEPTIONIST]);
    const { id } = await params;
    const result = await service.cancel(id, await request.json(), actor.sub);
    await new AppointmentNotificationService().sendCancellationNotice(id);
    return Response.json(result);
  } catch (error) { return handleApiError(error); }
}
