import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export class EmailOutboxRepository {
  constructor(private readonly db: Prisma.TransactionClient = prisma) {}
  enqueue(appointmentId: string, kind: "BOOKING" | "CONFIRMATION" | "CANCELLATION") {
    return this.db.emailOutbox.upsert({ where: { appointmentId_kind: { appointmentId, kind } }, update: {}, create: { id: randomUUID(), appointmentId, kind } });
  }
  async claim(appointmentId?: string) {
    const rows = await this.db.$queryRaw<Array<{ id: string; appointmentId: string; kind: string; attempts: number; lockedUntil: Date }>>`
      UPDATE email_outbox SET "lockedUntil" = CURRENT_TIMESTAMP + INTERVAL '5 minutes', attempts = attempts + 1
      WHERE id = (SELECT id FROM email_outbox WHERE "deliveredAt" IS NULL AND attempts < 10
        AND "availableAt" <= CURRENT_TIMESTAMP AND ("lockedUntil" IS NULL OR "lockedUntil" < CURRENT_TIMESTAMP)
        AND (${appointmentId ?? null}::text IS NULL OR "appointmentId" = ${appointmentId ?? null})
        ORDER BY "availableAt", id FOR UPDATE SKIP LOCKED LIMIT 1)
      RETURNING id, "appointmentId", kind, attempts, "lockedUntil"`;
    return rows[0];
  }
  finish(id: string, lockedUntil: Date, sent: boolean, attempts: number, outcome?: string) {
    return this.db.emailOutbox.updateMany({ where: { id, lockedUntil, deliveredAt: null }, data: {
      lockedUntil: null, outcome: outcome ?? (sent ? "SMTP_ACCEPTED" : "RETRY"), ...(sent ? { deliveredAt: new Date() } : { availableAt: new Date(Date.now() + Math.min(3600, 30 * 2 ** attempts) * 1000) }),
    } });
  }
  appointment(id: string) { return this.db.appointment.findUnique({ where: { id }, select: { status: true, date: true, startTime: true, patient: { select: { email: true } } } }); }
}
