-- ============================================================
-- BIODENTIS - Modulo "Dashboard"
-- Tratamientos, planes multisesion, sala de espera e inventario.
-- Aplicar con: psql $DATABASE_URL -f prisma/migrations-dashboard.sql
-- (o `pnpm db:push`, que deriva todo esto del schema.prisma)
-- ============================================================

-- ── Enums ───────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "AppointmentPriority" AS ENUM ('NORMAL', 'URGENT', 'EMERGENCY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "WaitingStatus" AS ENUM ('NOT_ARRIVED', 'WAITING', 'TRIAGE', 'IN_CHAIR', 'DONE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TreatmentPlanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Codigo visible del paciente (#PAC-0001) ─────────────────
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "patientCode" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "users_patientCode_key" ON "users"("patientCode");

-- ── Catalogo de tratamientos ────────────────────────────────
CREATE TABLE IF NOT EXISTS "treatments" (
    "id"              TEXT         NOT NULL,
    "name"            TEXT         NOT NULL,
    "category"        TEXT         NOT NULL,
    "durationMinutes" INTEGER      NOT NULL DEFAULT 30,
    "price"           DECIMAL(10,2) NOT NULL,
    "description"     TEXT,
    "isActive"        BOOLEAN      NOT NULL DEFAULT true,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,
    CONSTRAINT "treatments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "treatments_category_idx" ON "treatments"("category");

-- ── Planes de tratamiento multisesion ───────────────────────
CREATE TABLE IF NOT EXISTS "treatment_plans" (
    "id"                TEXT                  NOT NULL,
    "patientId"         TEXT                  NOT NULL,
    "dentistId"         TEXT                  NOT NULL,
    "treatmentId"       TEXT                  NOT NULL,
    "status"            "TreatmentPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "totalSessions"     INTEGER               NOT NULL DEFAULT 1,
    "completedSessions" INTEGER               NOT NULL DEFAULT 0,
    "startedAt"         TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt"       TIMESTAMP(3),
    "notes"             TEXT,
    CONSTRAINT "treatment_plans_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "treatment_plans_status_idx"    ON "treatment_plans"("status");
CREATE INDEX IF NOT EXISTS "treatment_plans_patientId_idx" ON "treatment_plans"("patientId");

-- ── Inventario de insumos ───────────────────────────────────
CREATE TABLE IF NOT EXISTS "inventory_items" (
    "id"        TEXT         NOT NULL,
    "name"      TEXT         NOT NULL,
    "sku"       TEXT         NOT NULL,
    "category"  TEXT         NOT NULL,
    "stock"     INTEGER      NOT NULL DEFAULT 0,
    "minStock"  INTEGER      NOT NULL DEFAULT 0,
    "unit"      TEXT         NOT NULL DEFAULT 'unidad',
    "isActive"  BOOLEAN      NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_items_sku_key"  ON "inventory_items"("sku");
CREATE INDEX        IF NOT EXISTS "inventory_items_category_idx" ON "inventory_items"("category");

-- ── Citas: tratamiento, sillon y sala de espera ─────────────
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "treatmentId"     TEXT;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "dentalUnitId"    TEXT;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "treatmentPlanId" TEXT;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "sessionNumber"   INTEGER;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "checkInAt"       TIMESTAMP(3);
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "calledAt"        TIMESTAMP(3);
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "priority"      "AppointmentPriority" NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "waitingStatus" "WaitingStatus"       NOT NULL DEFAULT 'NOT_ARRIVED';

CREATE INDEX IF NOT EXISTS "appointments_date_status_idx"        ON "appointments"("date", "status");
CREATE INDEX IF NOT EXISTS "appointments_date_waitingStatus_idx" ON "appointments"("date", "waitingStatus");

-- ── Claves foraneas ─────────────────────────────────────────
DO $$
DECLARE
  fk RECORD;
BEGIN
  FOR fk IN
    SELECT * FROM (VALUES
      ('treatment_plans', 'treatment_plans_patientId_fkey',    'patientId',       'users',           'RESTRICT'),
      ('treatment_plans', 'treatment_plans_dentistId_fkey',    'dentistId',       'dentists',        'RESTRICT'),
      ('treatment_plans', 'treatment_plans_treatmentId_fkey',  'treatmentId',     'treatments',      'RESTRICT'),
      ('appointments',    'appointments_treatmentId_fkey',     'treatmentId',     'treatments',      'SET NULL'),
      ('appointments',    'appointments_dentalUnitId_fkey',    'dentalUnitId',    'dental_units',    'SET NULL'),
      ('appointments',    'appointments_treatmentPlanId_fkey', 'treatmentPlanId', 'treatment_plans', 'SET NULL')
    ) AS t(tbl, cname, col, ref, ondelete)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = fk.cname) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I("id") ON DELETE %s ON UPDATE CASCADE',
        fk.tbl, fk.cname, fk.col, fk.ref, fk.ondelete
      );
    END IF;
  END LOOP;
END $$;

-- ── Meta de ingresos diaria que muestra el dashboard ─────────
INSERT INTO "system_settings" ("id", "key", "value", "type")
VALUES (gen_random_uuid()::text, 'dashboard_daily_revenue_goal', '1800', 'NUMBER')
ON CONFLICT ("key") DO NOTHING;
