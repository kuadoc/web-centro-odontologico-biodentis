import { NextRequest } from "next/server";
import { requireRole } from "@/lib/middleware";
import { AuthorizationError } from "@/lib/errors";
import { Role } from "@biodentis/shared-types";
import { prisma } from "@/lib/prisma";

const DASHBOARD_ROLES = [Role.ADMIN, Role.DENTIST, Role.RECEPTIONIST];

export interface DashboardScope {
  /** Definido solo cuando el panel debe acotarse a un odontologo concreto. */
  dentistId?: string;
  date?: string;
  role: Role;
}

/**
 * Autoriza el acceso al dashboard y decide el alcance de los datos.
 *
 * - DENTIST: queda acotado a su propia ficha SIEMPRE. No puede ampliar el alcance
 *   por query string ni ver la gestion de otro odontologo.
 * - ADMIN y RECEPTIONIST: ven toda la clinica y pueden acotar con `?dentistId=`.
 * - PATIENT: no tiene acceso (requireRole lanza 403).
 */
export async function resolveDashboardScope(request: NextRequest): Promise<DashboardScope> {
  const auth = await requireRole(request, DASHBOARD_ROLES);
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? undefined;

  if (auth.role === Role.DENTIST) {
    const dentist = await prisma.dentist.findUnique({
      where: { userId: auth.sub },
      select: { id: true },
    });
    if (!dentist) {
      throw new AuthorizationError("Tu usuario no tiene ficha de odontólogo asociada");
    }
    // Se ignora cualquier `dentistId` recibido: el alcance lo fija el token.
    return { dentistId: dentist.id, date, role: auth.role };
  }

  return { dentistId: searchParams.get("dentistId") ?? undefined, date, role: auth.role };
}
