BEGIN;
ALTER TABLE clinical_records DROP CONSTRAINT clinical_notes_check;
ALTER TABLE clinical_records ADD CONSTRAINT clinical_notes_check CHECK (notes ~ '[^[:space:]]');
ALTER TABLE users ADD CONSTRAINT users_phone_check CHECK (
  phone IS NULL OR phone = '' OR (length(phone) <= 25 AND phone ~ '^[+()0-9[:space:]-]+$'
  AND length(regexp_replace(phone, '[^0-9]', '', 'g')) >= 6));
ALTER TABLE users ADD CONSTRAINT users_secondary_phone_check CHECK (
  "secondaryPhone" IS NULL OR "secondaryPhone" = '' OR (length("secondaryPhone") <= 25 AND "secondaryPhone" ~ '^[+()0-9[:space:]-]+$'
  AND length(regexp_replace("secondaryPhone", '[^0-9]', '', 'g')) >= 6));
ALTER TABLE clinic ADD CONSTRAINT clinic_ruc_check CHECK (rut IS NULL OR rut = '' OR rut ~ '^[0-9]{11}$');
ALTER TABLE clinic ADD CONSTRAINT clinic_phone_check CHECK (
  phone IS NULL OR phone = '' OR (length(phone) <= 25 AND phone ~ '^[+()0-9[:space:]-]+$'
  AND length(regexp_replace(phone, '[^0-9]', '', 'g')) >= 6));
ALTER TABLE email_outbox DROP CONSTRAINT email_outbox_kind_check;
ALTER TABLE email_outbox ADD CONSTRAINT email_outbox_kind_check CHECK (kind IN ('BOOKING', 'CONFIRMATION', 'CANCELLATION'));
COMMIT;
