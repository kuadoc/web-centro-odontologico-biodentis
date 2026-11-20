import { NextRequest } from "next/server";
import { Role } from "@biodentis/shared-types";
import { EmailOutboxService } from "@/modules/appointments/email-outbox.service";
import { CancellationService } from "@/modules/appointments/cancellation.service";
import { requireRole } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";

const service = new CancellationService();

/** PATCH /api/appointments/[id]/cancel — cancel; exclusivo de RECEPTIONIST. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole(request, [Role.RECEPTIONIST, Role.PATIENT]);
    const { id } = await params;
    const input = await request.json();
    const result = actor.role === Role.PATIENT ? await service.cancelOwn(id, input, actor.sub) : await service.cancel(id, input, actor.sub);
    await new EmailOutboxService().tryDeliver(id);
    return Response.json(result);
  } catch (error) { return handleApiError(error); }
}
