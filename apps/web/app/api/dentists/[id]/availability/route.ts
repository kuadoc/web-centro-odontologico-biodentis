import { NextRequest } from "next/server";
import { AvailabilityService } from "@/modules/availability/availability.service";
import { requireRole } from "@/lib/middleware";
import { Role } from "@biodentis/shared-types";
import { handleApiError } from "@/lib/errors";

const availabilityService = new AvailabilityService();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date) {
      return Response.json(await availabilityService.getWeekly(id));
    }

    const slots = await availabilityService.getAvailableSlots(id, date);
    return Response.json(slots);
  } catch (error) {
    return handleApiError(error);
  }
}

/** PUT /api/dentists/[id]/availability — reemplaza el horario semanal fijo del odontologo (solo ADMIN). */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(request, [Role.ADMIN]);
    const { id } = await params;
    const body = await request.json();
    return Response.json(await availabilityService.replaceWeekly(id, body));
  } catch (error) {
    return handleApiError(error);
  }
}
