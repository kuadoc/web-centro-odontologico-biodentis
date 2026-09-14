import { prisma } from "./prisma";

/**
 * Genera el siguiente codigo visible de paciente (#PAC-0001).
 *
 * Se calcula a partir del maximo existente, no del conteo, para que borrar un
 * paciente no provoque un codigo duplicado. Reintenta ante una colision por
 * creaciones concurrentes.
 */
export async function nextPatientCode(attempt = 0): Promise<string> {
  const last = await prisma.user.findFirst({
    where: { patientCode: { not: null } },
    orderBy: { patientCode: "desc" },
    select: { patientCode: true },
  });

  const lastNumber = last?.patientCode ? Number(last.patientCode.replace(/\D/g, "")) : 0;
  const candidate = `#PAC-${String(lastNumber + 1 + attempt).padStart(4, "0")}`;

  const taken = await prisma.user.findUnique({
    where: { patientCode: candidate },
    select: { id: true },
  });
  if (taken) {
    if (attempt > 10) throw new Error("No se pudo generar un código de paciente único");
    return nextPatientCode(attempt + 1);
  }

  return candidate;
}
