import { NextRequest } from "next/server";
import { ConfigService } from "@/modules/config/config.service";
import { requireRole } from "@/lib/middleware";
import { Role } from "@biodentis/shared-types";
import { handleApiError } from "@/lib/errors";

const configService = new ConfigService();

export async function GET() {
  try {
    const settings = await configService.getJwtSettings();
    return Response.json(settings);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireRole(request, [Role.ADMIN]);
    const body = await request.json();
    const result = await configService.bulkUpdateSettings(body);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
