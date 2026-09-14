import { NextRequest } from "next/server";
import { requireRole } from "@/lib/middleware";
import { AuthorizationError } from "@/lib/errors";
import { Role } from "@biodentis/shared-types";
import { prisma } from "@/lib/prisma";
import type { PatientScope } from "./patient.service";

const DIRECTORY_ROLES = [Role.ADMIN, Role.DENTIST, Role.RECEPTIONIST];

export interface ResolvedPatientScope extends PatientScope {
  role: Role;
  actorId: string;
}

/**
 * Autoriza el directorio de pacientes y decide que subconjunto se ve.
 *
 * - ADMIN: todos los pacientes de la clinica.
 * - RECEPTIONIST: todos (necesita el directorio completo para agendar).
 * - DENTIST: SOLO los pacientes que el ha atendido. No ve los de otro odontologo.
 * - PATIENT: sin acceso (requireRole lanza 403).
 */
export async function resolvePatientScope(request: NextRequest): Promise<ResolvedPatientScope> {
  const auth = await requireRole(request, DIRECTORY_ROLES);

  if (auth.role === Role.DENTIST) {
    const dentist = await prisma.dentist.findUnique({
      where: { userId: auth.sub },
      select: { id: true },
    });
    if (!dentist) {
      throw new AuthorizationError("Tu usuario no tiene ficha de odontólogo asociada");
    }
    return { attendedByDentistId: dentist.id, role: auth.role, actorId: auth.sub };
  }

  return { role: auth.role, actorId: auth.sub };
}

/** Escrituras del directorio: alta, edicion y cambio de estado. Nunca un odontologo. */
export async function requirePatientAdmin(request: NextRequest): Promise<{ actorId: string; role: Role }> {
  const auth = await requireRole(request, [Role.ADMIN, Role.RECEPTIONIST]);
  return { actorId: auth.sub, role: auth.role };
}
