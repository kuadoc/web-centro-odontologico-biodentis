import { NextRequest } from "next/server";
import { ExceptionService } from "@/modules/config/exception.service";
import { requireRole } from "@/lib/middleware";
import { Role } from "@biodentis/shared-types";
import { handleApiError } from "@/lib/errors";

const exceptionService = new ExceptionService();

/** GET /api/config/exceptions — lista excepciones (filtros: dentistId, scope, status, from, to). Solo ADMIN. */
export async function GET(request: NextRequest) {
  try {
    await requireRole(request, [Role.ADMIN]);
    const { searchParams } = new URL(request.url);
    const exceptions = await exceptionService.list(Object.fromEntries(searchParams));
    return Response.json(exceptions);
  } catch (error) {
    return handleApiError(error);
  }
}

/** POST /api/config/exceptions — crea feriado, receso o mantenimiento que bloquea la agenda. Solo ADMIN. */
export async function POST(request: NextRequest) {
  try {
    const { sub: actorId } = await requireRole(request, [Role.ADMIN]);
    const body = await request.json();
    const exception = await exceptionService.create(body, actorId);
    return Response.json(exception, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
