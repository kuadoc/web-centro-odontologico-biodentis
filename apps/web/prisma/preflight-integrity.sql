-- Solo lectura. Ejecutar primero en copia local; ninguna corrección automática.
-- Debe devolver cero filas antes de aplicar las migraciones de integridad.
SELECT 'appointment_time_or_session' AS issue, id FROM appointments
 WHERE "startTime" !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' OR "endTime" !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
 OR "startTime" >= "endTime" OR "sessionNumber" <= 0
UNION ALL SELECT 'appointment_overlap', a.id || ' / ' || b.id FROM appointments a JOIN appointments b
 ON a.id < b.id AND a."dentistId" = b."dentistId" AND a.date = b.date
 AND a.status <> 'CANCELLED' AND b.status <> 'CANCELLED' AND a."startTime" < b."endTime" AND b."startTime" < a."endTime"
UNION ALL SELECT 'availability_domain', id FROM availability
 WHERE "dayOfWeek" NOT BETWEEN 0 AND 6 OR "startTime" !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
 OR "endTime" !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' OR "startTime" >= "endTime"
UNION ALL SELECT 'treatment_domain', id FROM treatments
 WHERE "durationMinutes" NOT BETWEEN 15 AND 720 OR "durationMinutes" % 15 <> 0 OR price < 0
UNION ALL SELECT 'inventory_domain', id FROM inventory_items WHERE stock < 0 OR "minStock" < 0
UNION ALL SELECT 'plan_domain', id FROM treatment_plans WHERE "totalSessions" <= 0 OR "completedSessions" < 0
 OR "completedSessions" > "totalSessions" OR "completedAt" < "startedAt"
UNION ALL SELECT 'exception_domain', id FROM schedule_exceptions WHERE "startDate" > "endDate" OR NOT (
 (scope = 'DENTIST' AND "dentistId" IS NOT NULL AND "dentalUnitId" IS NULL) OR
 (scope = 'UNIT' AND "dentalUnitId" IS NOT NULL AND "dentistId" IS NULL) OR
 (scope = 'CLINIC' AND "dentistId" IS NULL AND "dentalUnitId" IS NULL))
UNION ALL SELECT 'dni_format', id FROM users WHERE dni IS NOT NULL AND dni !~ '^[0-9]{8}$'
UNION ALL SELECT 'dni_duplicate', string_agg(id, ' / ') FROM users WHERE dni IS NOT NULL GROUP BY dni HAVING count(*) > 1
UNION ALL SELECT 'user_phone', id FROM users WHERE phone IS NOT NULL AND phone <> '' AND
 (length(phone) > 25 OR phone !~ '^[+()0-9[:space:]-]+$' OR length(regexp_replace(phone, '[^0-9]', '', 'g')) < 6)
UNION ALL SELECT 'secondary_phone', id FROM users WHERE "secondaryPhone" IS NOT NULL AND "secondaryPhone" <> '' AND
 (length("secondaryPhone") > 25 OR "secondaryPhone" !~ '^[+()0-9[:space:]-]+$' OR length(regexp_replace("secondaryPhone", '[^0-9]', '', 'g')) < 6)
UNION ALL SELECT 'clinic_ruc', id FROM clinic WHERE rut IS NOT NULL AND rut <> '' AND rut !~ '^[0-9]{11}$'
UNION ALL SELECT 'clinic_phone', id FROM clinic WHERE phone IS NOT NULL AND phone <> '' AND
 (length(phone) > 25 OR phone !~ '^[+()0-9[:space:]-]+$' OR length(regexp_replace(phone, '[^0-9]', '', 'g')) < 6)
UNION ALL SELECT 'clinical_record_mismatch', r.id FROM clinical_records r JOIN appointments a ON a.id = r."appointmentId"
 WHERE r."patientId" <> a."patientId" OR r."dentistId" <> a."dentistId" OR a.status <> 'COMPLETED' OR r.notes !~ '[^[:space:]]'
UNION ALL SELECT 'cancelled_by_missing', a.id FROM appointments a LEFT JOIN users u ON u.id = a."cancelledById"
 WHERE a."cancelledById" IS NOT NULL AND u.id IS NULL
ORDER BY issue, id;

-- Diagnóstico de copias de compatibilidad (no altera datos históricos).
SELECT t.id, t.category AS cached_category, s.name AS authoritative_category
 FROM treatments t JOIN specialties s ON s.id = t."specialtyId" WHERE t.category IS DISTINCT FROM s.name;
