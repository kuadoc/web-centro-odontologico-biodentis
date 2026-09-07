import { NextRequest } from "next/server";
import { UserService } from "@/modules/users/user.service";
import { requireRole } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";
import { Role } from "@biodentis/shared-types";

const userService = new UserService();

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, [Role.ADMIN]);
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role") || undefined;
    const users = await userService.getAll(role);
    return Response.json(users);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, [Role.ADMIN]);
    const body = await request.json();
    const user = await userService.create(body);
    return Response.json(user, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
