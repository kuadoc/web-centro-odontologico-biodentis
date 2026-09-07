import { NextRequest } from "next/server";
import { ConfigService } from "@/modules/config/config.service";
import { requireRole } from "@/lib/middleware";
import { Role } from "@biodentis/shared-types";
import { handleApiError } from "@/lib/errors";

const configService = new ConfigService();

export async function GET() {
  try {
    const config = await configService.getFullConfig();
    return Response.json(config);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireRole(request, [Role.ADMIN]);
    const body = await request.json();
    const clinic = await configService.updateClinic(body);
    return Response.json(clinic);
  } catch (error) {
    return handleApiError(error);
  }
}
