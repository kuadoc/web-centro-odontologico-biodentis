import { NextRequest } from "next/server";
import { AvailabilityService } from "@/modules/availability/availability.service";
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
      return Response.json({ error: " date es requerido" }, { status: 400 });
    }

    const slots = await availabilityService.getAvailableSlots(id, date);
    return Response.json(slots);
  } catch (error) {
    return handleApiError(error);
  }
}
