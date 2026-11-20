import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/** nextval es atómico entre conexiones; los huecos por rollback son deliberados. */
export async function nextPatientCode(db: Prisma.TransactionClient = prisma): Promise<string> {
  for (;;) {
    const [row] = await db.$queryRaw<Array<{ value: bigint }>>`SELECT nextval('patient_code_seq') AS value`;
    const candidate = `#PAC-${String(row!.value).padStart(4, "0")}`;
    // Compatibilidad con códigos cargados mediante seed o importación administrativa.
    if (!(await db.user.findUnique({ where: { patientCode: candidate }, select: { id: true } }))) return candidate;
  }
}
