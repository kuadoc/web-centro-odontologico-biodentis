import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { handleApiError } from "@/lib/errors";

const authService = new AuthService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await authService.register(body);
    return Response.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
