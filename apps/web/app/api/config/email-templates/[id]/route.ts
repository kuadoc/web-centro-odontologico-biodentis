import { NextRequest } from "next/server";
import { ConfigService } from "@/modules/config/config.service";
import { requireRole } from "@/lib/middleware";
import { Role } from "@biodentis/shared-types";
import { handleApiError } from "@/lib/errors";

const configService = new ConfigService();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(request, [Role.ADMIN]);
    const { id } = await params;
    const body = await request.json();
    const template = await configService.updateEmailTemplate(id, body);
    return Response.json(template);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(request, [Role.ADMIN]);
    const { id } = await params;
    await configService.deleteEmailTemplate(id);
    return Response.json({ message: "Plantilla eliminada" });
  } catch (error) {
    return handleApiError(error);
  }
}
