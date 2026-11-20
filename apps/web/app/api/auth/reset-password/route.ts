import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/errors";
import { PasswordResetService } from "@/modules/auth/password-reset.service";

const service = new PasswordResetService();

/** POST /api/auth/reset-password ? consume el token una sola vez y revoca sesiones. */
export async function POST(request: NextRequest) {
  try {
    return Response.json(await service.reset(await request.json()));
  } catch (error) {
    return handleApiError(error);
  }
}
