import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { handleApiError } from "@/lib/errors";

const authService = new AuthService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await authService.login(body);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
