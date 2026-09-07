import { NextRequest } from "next/server";
import { ConfigService } from "@/modules/config/config.service";
import { requireRole } from "@/lib/middleware";
import { Role } from "@biodentis/shared-types";
import { handleApiError } from "@/lib/errors";

const configService = new ConfigService();

export async function GET() {
  try {
    const templates = await configService.getEmailTemplates();
    return Response.json(templates);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, [Role.ADMIN]);
    const body = await request.json();
    const template = await configService.createEmailTemplate(body);
    return Response.json(template, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
