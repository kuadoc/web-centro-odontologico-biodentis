import { NextRequest } from "next/server";
import { ClinicService } from "@/modules/clinic/clinic.service";
import { authenticate } from "@/lib/middleware";
import { Role } from "@workspace/shared-validators";
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
    const user = authenticate(request);
    if (user.role !== Role.ADMIN) {
      return Response.json({ error: "Solo administradores pueden modificar la clínica" }, { status: 403 });
    }
    const body = await request.json();
    const clinic = await clinicService.update(body);
    return Response.json(clinic);
  } catch (error) {
    return handleApiError(error);
  }
}
