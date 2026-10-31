-- Actualización aditiva del catálogo. Ejecutar UNA VEZ sobre la base existente.
-- No elimina servicios, citas, planes ni historiales. Los precios existentes se conservan.
BEGIN;
CREATE TABLE IF NOT EXISTS "specialties" (
 "id" TEXT PRIMARY KEY, "name" TEXT NOT NULL UNIQUE, "description" TEXT,
 "isActive" BOOLEAN NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS "_DentistToSpecialty" (
 "A" TEXT NOT NULL REFERENCES "dentists"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "B" TEXT NOT NULL REFERENCES "specialties"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "_DentistToSpecialty_AB_pkey" PRIMARY KEY ("A", "B")
);
CREATE INDEX IF NOT EXISTS "_DentistToSpecialty_B_index" ON "_DentistToSpecialty"("B");
ALTER TABLE "treatments" ALTER COLUMN "price" DROP NOT NULL;
ALTER TABLE "treatments" ADD COLUMN IF NOT EXISTS "specialtyId" TEXT REFERENCES "specialties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
INSERT INTO "specialties" ("id", "name") VALUES
 (gen_random_uuid()::text, 'Odontología general'),
 (gen_random_uuid()::text, 'Ortodoncia'),
 (gen_random_uuid()::text, 'Endodoncia'),
 (gen_random_uuid()::text, 'Periodoncia'),
 (gen_random_uuid()::text, 'Odontopediatría'),
 (gen_random_uuid()::text, 'Rehabilitación oral y prostodoncia'),
 (gen_random_uuid()::text, 'Implantología'),
 (gen_random_uuid()::text, 'Cirugía oral y maxilofacial'),
 (gen_random_uuid()::text, 'Odontología estética')
ON CONFLICT ("name") DO NOTHING;

-- Reconoce categorías históricas y conserva las categorías adicionales.
INSERT INTO "specialties" ("id", "name")
SELECT gen_random_uuid()::text, names.name
FROM (SELECT DISTINCT CASE lower(translate(trim("category"), 'ÁÉÍÓÚáéíóú', 'AEIOUaeiou'))
 WHEN 'diagnostico' THEN 'Odontología general' WHEN 'higiene' THEN 'Odontología general' WHEN 'restauracion' THEN 'Odontología general' WHEN 'general' THEN 'Odontología general' WHEN 'odontologia general' THEN 'Odontología general'
 WHEN 'cirugia' THEN 'Cirugía oral y maxilofacial' WHEN 'cirugia maxilofacial' THEN 'Cirugía oral y maxilofacial'
 WHEN 'implantes' THEN 'Implantología' WHEN 'rehabilitacion' THEN 'Rehabilitación oral y prostodoncia' WHEN 'protesis y rehabilitacion' THEN 'Rehabilitación oral y prostodoncia'
 WHEN 'estetica' THEN 'Odontología estética' WHEN 'estetica dental' THEN 'Odontología estética'
 ELSE trim("category") END AS name FROM "treatments") names
WHERE names.name <> '' AND NOT EXISTS (SELECT 1 FROM "specialties" s WHERE lower(s.name) = lower(names.name))
ON CONFLICT DO NOTHING;
UPDATE "treatments" t SET "specialtyId" = s.id FROM "specialties" s
WHERE t."specialtyId" IS NULL AND lower(s.name) = lower(CASE lower(translate(trim(t."category"), 'ÁÉÍÓÚáéíóú', 'AEIOUaeiou'))
 WHEN 'diagnostico' THEN 'Odontología general' WHEN 'higiene' THEN 'Odontología general' WHEN 'restauracion' THEN 'Odontología general' WHEN 'general' THEN 'Odontología general' WHEN 'odontologia general' THEN 'Odontología general'
 WHEN 'cirugia' THEN 'Cirugía oral y maxilofacial' WHEN 'cirugia maxilofacial' THEN 'Cirugía oral y maxilofacial'
 WHEN 'implantes' THEN 'Implantología' WHEN 'rehabilitacion' THEN 'Rehabilitación oral y prostodoncia' WHEN 'protesis y rehabilitacion' THEN 'Rehabilitación oral y prostodoncia'
 WHEN 'estetica' THEN 'Odontología estética' WHEN 'estetica dental' THEN 'Odontología estética'
 ELSE trim(t."category") END);

-- Las asignaciones iniciales usan solo perfiles reales y su especialidad actual.
INSERT INTO "_DentistToSpecialty" ("A", "B")
SELECT d.id, s.id FROM "dentists" d JOIN "users" u ON u.id = d."userId"
JOIN "specialties" s ON lower(s.name) = lower(CASE lower(translate(trim(d."specialty"), 'ÁÉÍÓÚáéíóú', 'AEIOUaeiou'))
 WHEN 'diagnostico' THEN 'Odontología general' WHEN 'higiene' THEN 'Odontología general' WHEN 'restauracion' THEN 'Odontología general' WHEN 'general' THEN 'Odontología general' WHEN 'odontologia general' THEN 'Odontología general'
 WHEN 'cirugia' THEN 'Cirugía oral y maxilofacial' WHEN 'cirugia maxilofacial' THEN 'Cirugía oral y maxilofacial'
 WHEN 'implantes' THEN 'Implantología' WHEN 'rehabilitacion' THEN 'Rehabilitación oral y prostodoncia' WHEN 'protesis y rehabilitacion' THEN 'Rehabilitación oral y prostodoncia'
 WHEN 'estetica' THEN 'Odontología estética' WHEN 'estetica dental' THEN 'Odontología estética'
 ELSE trim(d."specialty") END)
WHERE u.role = 'DENTIST' AND u."isActive" = true
ON CONFLICT DO NOTHING;

-- Servicios del boceto: precio sin definir, duración inicial de 30 minutos.
INSERT INTO "treatments" ("id", "name", "category", "specialtyId", "durationMinutes", "price", "updatedAt")
SELECT gen_random_uuid()::text, v.name, s.name, s.id, 30, NULL, CURRENT_TIMESTAMP
FROM (VALUES
 ('Odontología general', 'Consulta y diagnóstico'),
 ('Odontología general', 'Limpieza dental (profilaxis) y destartraje'),
 ('Odontología general', 'Resinas (empastes)'),
 ('Odontología general', 'Extracciones simples'),
 ('Odontología general', 'Aplicación de flúor y selladores'),
 ('Odontología general', 'Radiografías periapicales'),
 ('Odontología general', 'Control y revisión periódica'),
 ('Ortodoncia', 'Estudio ortodóntico'),
 ('Ortodoncia', 'Brackets metálicos'),
 ('Ortodoncia', 'Brackets estéticos'),
 ('Ortodoncia', 'Alineadores invisibles'),
 ('Ortodoncia', 'Control mensual de ortodoncia'),
 ('Endodoncia', 'Tratamiento de conductos'),
 ('Endodoncia', 'Retratamiento de conductos'),
 ('Endodoncia', 'Apicectomía'),
 ('Endodoncia', 'Manejo de urgencia por dolor'),
 ('Periodoncia', 'Evaluación periodontal'),
 ('Periodoncia', 'Raspado y alisado radicular'),
 ('Periodoncia', 'Cirugía periodontal'),
 ('Periodoncia', 'Mantenimiento periodontal'),
 ('Odontopediatría', 'Consulta y primera visita del niño'),
 ('Odontopediatría', 'Selladores de fosas y fisuras'),
 ('Odontopediatría', 'Pulpotomía y pulpectomía'),
 ('Odontopediatría', 'Mantenedores de espacio'),
 ('Rehabilitación oral y prostodoncia', 'Coronas'),
 ('Rehabilitación oral y prostodoncia', 'Puentes fijos'),
 ('Rehabilitación oral y prostodoncia', 'Incrustaciones (inlays y onlays)'),
 ('Rehabilitación oral y prostodoncia', 'Prótesis total (dentadura completa)'),
 ('Implantología', 'Estudio y planificación (tomografía)'),
 ('Implantología', 'Colocación de implante dental'),
 ('Implantología', 'Injerto óseo'),
 ('Implantología', 'Elevación de seno maxilar'),
 ('Cirugía oral y maxilofacial', 'Extracción de terceras molares'),
 ('Cirugía oral y maxilofacial', 'Extracciones quirúrgicas'),
 ('Cirugía oral y maxilofacial', 'Frenectomía'),
 ('Cirugía oral y maxilofacial', 'Biopsia oral'),
 ('Odontología estética', 'Blanqueamiento dental'),
 ('Odontología estética', 'Carillas de resina'),
 ('Odontología estética', 'Carillas de porcelana'),
 ('Odontología estética', 'Diseño de sonrisa digital')
) AS v(specialty, name)
JOIN "specialties" s ON s.name = v.specialty
WHERE NOT EXISTS (SELECT 1 FROM "treatments" t WHERE t."specialtyId" = s.id AND lower(t.name) = lower(v.name))
ON CONFLICT DO NOTHING;
COMMIT;

