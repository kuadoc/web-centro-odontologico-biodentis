BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- No se reescribe la migración inicial ya publicada ni se corrigen datos en silencio.
DROP INDEX IF EXISTS "appointments_dentistId_date_startTime_key";
CREATE UNIQUE INDEX IF NOT EXISTS "appointments_active_slot_key"
  ON appointments ("dentistId", date, "startTime") WHERE status <> 'CANCELLED';
CREATE INDEX IF NOT EXISTS "appointments_dentistId_date_startTime_idx" ON appointments ("dentistId", date, "startTime");

ALTER TABLE availability ADD CONSTRAINT availability_domain_check CHECK (
  "dayOfWeek" BETWEEN 0 AND 6 AND "startTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  AND "endTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "startTime" < "endTime");
ALTER TABLE appointments ADD CONSTRAINT appointments_time_check CHECK (
  "startTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "endTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  AND "startTime" < "endTime" AND ("sessionNumber" IS NULL OR "sessionNumber" > 0));
ALTER TABLE treatments ADD CONSTRAINT treatments_domain_check CHECK (
  "durationMinutes" BETWEEN 15 AND 720 AND "durationMinutes" % 15 = 0 AND (price IS NULL OR price >= 0));
ALTER TABLE inventory_items ADD CONSTRAINT inventory_domain_check CHECK (stock >= 0 AND "minStock" >= 0);
ALTER TABLE treatment_plans ADD CONSTRAINT plans_domain_check CHECK (
  "totalSessions" > 0 AND "completedSessions" BETWEEN 0 AND "totalSessions"
  AND ("completedAt" IS NULL OR "completedAt" >= "startedAt"));
ALTER TABLE schedule_exceptions ADD CONSTRAINT exceptions_domain_check CHECK (
  "startDate" <= "endDate" AND (
    (scope = 'DENTIST' AND "dentistId" IS NOT NULL AND "dentalUnitId" IS NULL) OR
    (scope = 'UNIT' AND "dentalUnitId" IS NOT NULL AND "dentistId" IS NULL) OR
    (scope = 'CLINIC' AND "dentistId" IS NULL AND "dentalUnitId" IS NULL)));
ALTER TABLE users ADD CONSTRAINT users_dni_check CHECK (dni IS NULL OR dni ~ '^[0-9]{8}$');
CREATE UNIQUE INDEX "users_dni_key" ON users (dni);
ALTER TABLE clinical_records ADD CONSTRAINT clinical_notes_check CHECK (length(btrim(notes)) > 0);
ALTER TABLE appointments ADD CONSTRAINT "appointments_cancelledById_fkey"
  FOREIGN KEY ("cancelledById") REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- La exclusión protege intervalos completos aun en escrituras fuera de la app.
-- Conversión a minutos con funciones inmutables, sin casts dependientes de TZ.
ALTER TABLE appointments ADD CONSTRAINT appointments_no_overlap EXCLUDE USING gist (
  "dentistId" WITH =, date WITH =,
  int4range(substring("startTime",1,2)::int * 60 + substring("startTime",4,2)::int,
            substring("endTime",1,2)::int * 60 + substring("endTime",4,2)::int, '[)') WITH &&
) WHERE (status <> 'CANCELLED');

-- Las referencias duplicadas en notas son datos derivados, comprobados al commit.
CREATE FUNCTION check_clinical_appointment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE appointment_id text;
BEGIN
  IF TG_TABLE_NAME = 'clinical_records' THEN appointment_id := NEW."appointmentId";
  ELSE appointment_id := NEW.id; END IF;
  IF EXISTS (
    SELECT 1 FROM clinical_records r JOIN appointments a ON a.id = r."appointmentId"
    WHERE a.id = appointment_id AND
      (r."patientId" <> a."patientId" OR r."dentistId" <> a."dentistId" OR a.status <> 'COMPLETED')
  ) THEN RAISE EXCEPTION 'La nota clínica no corresponde a la cita atendida' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM clinical_records r JOIN appointments a ON a.id = r."appointmentId"
    WHERE r."patientId" <> a."patientId" OR r."dentistId" <> a."dentistId" OR a.status <> 'COMPLETED')
  THEN RAISE EXCEPTION 'Revisar notas clínicas existentes antes de migrar'; END IF;
END $$;
CREATE CONSTRAINT TRIGGER clinical_record_matches_appointment AFTER INSERT OR UPDATE ON clinical_records
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_clinical_appointment();
CREATE CONSTRAINT TRIGGER appointment_matches_clinical_record AFTER UPDATE ON appointments
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_clinical_appointment();

CREATE TABLE auth_throttles (
  key text PRIMARY KEY, count integer NOT NULL CHECK (count > 0), "expiresAt" timestamp(3) NOT NULL
);
CREATE INDEX "auth_throttles_expiresAt_idx" ON auth_throttles ("expiresAt");
CREATE TABLE email_outbox (
  id text PRIMARY KEY, "appointmentId" text NOT NULL REFERENCES appointments(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  kind text NOT NULL CHECK (kind IN ('BOOKING', 'CANCELLATION')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  "availableAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deliveredAt" timestamp(3), "lockedUntil" timestamp(3),
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "email_outbox_appointmentId_kind_key" ON email_outbox ("appointmentId", kind);
CREATE INDEX "email_outbox_deliveredAt_availableAt_idx" ON email_outbox ("deliveredAt", "availableAt");
-- category se conserva por compatibilidad de API: su autoridad es Specialty.name.
CREATE FUNCTION sync_treatment_category() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."specialtyId" IS NOT NULL THEN
    SELECT name INTO NEW.category FROM specialties WHERE id = NEW."specialtyId";
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER treatment_category_from_specialty BEFORE INSERT OR UPDATE OF "specialtyId", category ON treatments
  FOR EACH ROW EXECUTE FUNCTION sync_treatment_category();
CREATE FUNCTION sync_specialty_name() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE treatments SET category = NEW.name WHERE "specialtyId" = NEW.id;
  RETURN NEW;
END $$;
CREATE TRIGGER specialty_name_to_treatments AFTER UPDATE OF name ON specialties
  FOR EACH ROW EXECUTE FUNCTION sync_specialty_name();
COMMIT;
