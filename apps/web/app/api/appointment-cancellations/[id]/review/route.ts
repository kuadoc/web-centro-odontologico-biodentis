import { NextRequest } from "next/server";
import { Role } from "@biodentis/shared-types";
import { AppointmentNotificationService } from "@/modules/appointments/appointment-notification.service";
import { CancellationService } from "@/modules/appointments/cancellation.service";
import { requireRole } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";

const service = new CancellationService();

/** PATCH /api/appointment-cancellations/[id]/review — review; exclusivo de ADMIN. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole(request, [Role.ADMIN]);
    const { id } = await params;
    const result = await service.review(id, await request.json(), actor.sub);
    if (result.state === "APPROVED") await new AppointmentNotificationService().sendCancellationNotice(result.appointmentId);
    return Response.json(result);
  } catch (error) { return handleApiError(error); }
}
