import { NextRequest } from "next/server";
import { ConfigService } from "@/modules/config/config.service";
import { requireRole } from "@/lib/middleware";
import { Role } from "@biodentis/shared-types";
import { handleApiError } from "@/lib/errors";

const configService = new ConfigService();

export async function PUT(request: NextRequest) {
  try {
    await requireRole(request, [Role.ADMIN]);
    const body = await request.json();
    const result = await configService.updateSetting(body);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
