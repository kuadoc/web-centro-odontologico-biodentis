import { Prisma, type PrismaClient } from "@prisma/client";
import { ScheduleConflictError } from "@/lib/errors";

/** Reservas, reasignaciones y bajas comparten aislamiento y reintentos de BD. */
export async function withScheduleTransaction<T>(
  database: Pick<PrismaClient, "$transaction">,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
  duplicateMessage = "El odontólogo ya tiene una cita en ese horario",
): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await database.$transaction(operation, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError)) throw error;
      if (error.code === "P2002") throw new ScheduleConflictError(duplicateMessage);
      if (error.code !== "P2034") throw error;
    }
  }
  throw new ScheduleConflictError("La agenda cambió durante la operación. Vuelve a consultar los datos.");
}
