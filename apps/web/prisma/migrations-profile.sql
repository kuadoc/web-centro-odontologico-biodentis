-- ============================================================
-- BIODENTIS - Modulo "Mi Perfil"
-- Campos nuevos para datos de contacto y ficha profesional.
-- Aplicar con: psql $DATABASE_URL -f prisma/migrations-profile.sql
-- (o simplemente `pnpm db:push`, que deriva estos cambios del schema.prisma)
-- ============================================================

-- users: telefono secundario / emergencias y avatar
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "secondaryPhone" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;

-- dentists: colegiatura, alma mater, turno y box asignado
ALTER TABLE "dentists" ADD COLUMN IF NOT EXISTS "licenseNumber"  TEXT;
ALTER TABLE "dentists" ADD COLUMN IF NOT EXISTS "university"     TEXT;
ALTER TABLE "dentists" ADD COLUMN IF NOT EXISTS "shiftLabel"     TEXT;
ALTER TABLE "dentists" ADD COLUMN IF NOT EXISTS "assignedUnitId" TEXT;

-- FK: dentists.assignedUnitId -> dental_units.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dentists_assignedUnitId_fkey'
  ) THEN
    ALTER TABLE "dentists"
      ADD CONSTRAINT "dentists_assignedUnitId_fkey"
      FOREIGN KEY ("assignedUnitId") REFERENCES "dental_units"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
