-- Migración aditiva. No cancela citas ni modifica estados existentes.
BEGIN;
DO $$ BEGIN
  CREATE TYPE "CancellationState" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "cancelledById" TEXT;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);
CREATE TABLE IF NOT EXISTS "appointment_cancellations" (
  "id" TEXT PRIMARY KEY,
  "appointmentId" TEXT NOT NULL REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "originalStatus" "AppointmentStatus" NOT NULL,
  "state" "CancellationState" NOT NULL DEFAULT 'REQUESTED',
  "requestedById" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "requestReason" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "reviewedById" TEXT REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "reviewerSnapshot" JSONB,
  "reviewReason" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "activeAppointmentId" TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS "appointment_cancellations_activeAppointmentId_key" ON "appointment_cancellations"("activeAppointmentId");
CREATE INDEX IF NOT EXISTS "appointment_cancellations_state_createdAt_idx" ON "appointment_cancellations"("state", "createdAt");
CREATE INDEX IF NOT EXISTS "appointment_cancellations_appointmentId_createdAt_idx" ON "appointment_cancellations"("appointmentId", "createdAt");
-- Una cancelación libera el turno; las citas activas conservan su protección única.
DROP INDEX IF EXISTS "appointments_dentistId_date_startTime_key";
CREATE UNIQUE INDEX IF NOT EXISTS "appointments_active_slot_key" ON "appointments"("dentistId", "date", "startTime") WHERE "status" <> 'CANCELLED';
CREATE INDEX IF NOT EXISTS "appointments_dentistId_date_startTime_idx" ON "appointments"("dentistId", "date", "startTime");
COMMIT;
