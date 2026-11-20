import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export class ReminderRepository {
  constructor(private readonly db: Prisma.TransactionClient = prisma) {}
  /** SQL usa la fecha civil y hora de Lima; cada reprogramación tiene su propia clave. */
  schedule(appointmentId?: string) {
    return this.db.$executeRaw`
      INSERT INTO email_outbox (id, "appointmentId", kind, "availableAt")
      SELECT gen_random_uuid()::text, a.id,
        'REMINDER:' || to_char(a.date, 'YYYY-MM-DD') || ':' || a."startTime",
        ((a.date + a."startTime"::time) AT TIME ZONE 'America/Lima') AT TIME ZONE 'UTC' - INTERVAL '24 hours'
      FROM appointments a
      WHERE a.status = 'CONFIRMED'
        AND (${appointmentId ?? null}::text IS NULL OR a.id = ${appointmentId ?? null})
        AND (a.date + a."startTime"::time) AT TIME ZONE 'America/Lima' > CURRENT_TIMESTAMP
      ON CONFLICT ("appointmentId", kind) DO NOTHING`;
  }
  start() { return this.db.scheduledJobRun.create({ data: { job: "appointment-reminders" } }); }
  finish(id: string, success: boolean, processed: number, failed: number) {
    return this.db.scheduledJobRun.update({ where: { id }, data: { finishedAt: new Date(), success, processed, failed } });
  }
}
