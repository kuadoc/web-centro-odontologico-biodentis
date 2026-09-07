import { NextRequest } from "next/server";
import { UserService } from "@/modules/users/user.service";
import { authenticate } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";

const userService = new UserService();

export async function GET(request: NextRequest) {
  try {
    const user = authenticate(request);
    const profile = await userService.getProfile(user.sub);
    return Response.json(profile);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = authenticate(request);
    const body = await request.json();
    const updated = await userService.updateProfile(user.sub, body);
    return Response.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
