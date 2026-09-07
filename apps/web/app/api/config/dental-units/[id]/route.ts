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
    const unit = await configService.updateDentalUnit(id, body);
    return Response.json(unit);
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
    await configService.deleteDentalUnit(id);
    return Response.json({ message: "Unidad eliminada" });
  } catch (error) {
    return handleApiError(error);
  }
}
