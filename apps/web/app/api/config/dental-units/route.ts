import { NextRequest } from "next/server";
import { ConfigService } from "@/modules/config/config.service";
import { requireRole } from "@/lib/middleware";
import { Role } from "@biodentis/shared-types";
import { handleApiError } from "@/lib/errors";

const configService = new ConfigService();

export async function GET() {
  try {
    const units = await configService.getDentalUnits();
    return Response.json(units);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, [Role.ADMIN]);
    const body = await request.json();
    const unit = await configService.createDentalUnit(body);
    return Response.json(unit, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
