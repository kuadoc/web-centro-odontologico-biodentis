BEGIN;
CREATE SEQUENCE patient_code_seq;
SELECT setval('patient_code_seq', COALESCE((
  SELECT MAX(substring("patientCode" FROM 6)::bigint)
  FROM users WHERE "patientCode" ~ '^#PAC-[0-9]+$'
), 0) + 1, false);
COMMIT;
