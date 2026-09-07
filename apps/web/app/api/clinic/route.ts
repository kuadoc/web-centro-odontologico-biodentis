import { NextRequest } from "next/server";
import { ClinicService } from "@/modules/clinic/clinic.service";
import { requireRole } from "@/lib/middleware";
import { Role } from "@biodentis/shared-types";
import { handleApiError } from "@/lib/errors";

const clinicService = new ClinicService();

export async function GET() {
  try {
    const clinic = await clinicService.get();
    return Response.json(clinic);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireRole(request, [Role.ADMIN]);
    const body = await request.json();
    const clinic = await clinicService.update(body);
    return Response.json(clinic);
  } catch (error) {
    return handleApiError(error);
  }
}
