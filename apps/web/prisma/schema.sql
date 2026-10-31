-- ============================================================
-- BIODENTIS - Schema SQL Generado desde Prisma
-- Base de datos: PostgreSQL
-- Fecha: 2026-09-06
-- Ultima revision: 2026-09-07 (Fases 3-7 de seguridad)
-- ============================================================
--
-- CAMBIOS DE SEGURIDAD (Fases 3-7):
--   - Tabla refresh_tokens: soporta rotacion, revocacion, jti unico
--   - Tokens: access (sub+jti, 15min) + refresh (jti, 7d, httpOnly cookie)
--   - Rate limiting y account lockout: manejados en memoria (no en DB)
--   - CORS, headers de seguridad, HTTPS: manejados en middleware
--   - Roles: verificados contra DB en cada operacion sensible
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE "Role" AS ENUM ('PATIENT', 'RECEPTIONIST', 'DENTIST', 'ADMIN');

CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'NO_SHOW', 'CANCELLED');

CREATE TYPE "DentalUnitType" AS ENUM ('SILLON', 'QUIRURGICO', 'RADIOLOGICO');

CREATE TYPE "DentalUnitStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'INACTIVE');

CREATE TYPE "ExceptionScope" AS ENUM ('DENTIST', 'CLINIC', 'UNIT');

CREATE TYPE "ExceptionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

CREATE TYPE "SettingType" AS ENUM ('NUMBER', 'STRING', 'BOOLEAN');

-- ============================================================
-- TABLA: users
-- ============================================================

CREATE TABLE "users" (
    "id"           TEXT NOT NULL DEFAULT gen_random_uuid(),
    "email"        TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role"         "Role" NOT NULL,
    "firstName"    TEXT NOT NULL,
    "lastName"     TEXT NOT NULL,
    "phone"        TEXT,
    "isActive"     BOOLEAN NOT NULL DEFAULT true,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Unique: email
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- ============================================================
-- TABLA: dentists
-- ============================================================

CREATE TABLE "dentists" (
    "id"        TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId"    TEXT NOT NULL,
    "specialty" TEXT NOT NULL,

    CONSTRAINT "dentists_pkey" PRIMARY KEY ("id")
);

-- Unique: userId
CREATE UNIQUE INDEX "dentists_userId_key" ON "dentists"("userId");

-- FK: dentists.userId -> users.id
ALTER TABLE "dentists" ADD CONSTRAINT "dentists_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- TABLA: availability
-- ============================================================

CREATE TABLE "availability" (
    "id"        TEXT NOT NULL DEFAULT gen_random_uuid(),
    "dentistId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime"   TEXT NOT NULL,

    CONSTRAINT "availability_pkey" PRIMARY KEY ("id")
);

-- Unique compuesto: (dentistId, dayOfWeek)
CREATE UNIQUE INDEX "availability_dentistId_dayOfWeek_key" ON "availability"("dentistId", "dayOfWeek");

-- FK: availability.dentistId -> dentists.id
ALTER TABLE "availability" ADD CONSTRAINT "availability_dentistId_fkey"
    FOREIGN KEY ("dentistId") REFERENCES "dentists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- TABLA: schedule_exceptions
-- ============================================================

CREATE TABLE "schedule_exceptions" (
    "id"        TEXT NOT NULL DEFAULT gen_random_uuid(),
    "dentistId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate"   TIMESTAMP(3) NOT NULL,
    "reason"    TEXT,
    "scope"     "ExceptionScope" NOT NULL DEFAULT 'DENTIST',
    "status"    "ExceptionStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "schedule_exceptions_pkey" PRIMARY KEY ("id")
);

-- Unique compuesto: (dentistId, startDate)
CREATE UNIQUE INDEX "schedule_exceptions_dentistId_startDate_key" ON "schedule_exceptions"("dentistId", "startDate");

-- FK: schedule_exceptions.dentistId -> dentists.id
ALTER TABLE "schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_dentistId_fkey"
    FOREIGN KEY ("dentistId") REFERENCES "dentists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- TABLA: appointments
-- ============================================================

CREATE TABLE "appointments" (
    "id"        TEXT NOT NULL DEFAULT gen_random_uuid(),
    "patientId" TEXT NOT NULL,
    "dentistId" TEXT NOT NULL,
    "date"      DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime"   TEXT NOT NULL,
    "status"    "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "notes"     TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- Unique compuesto: (dentistId, date, startTime)
CREATE UNIQUE INDEX "appointments_dentistId_date_startTime_key" ON "appointments"("dentistId", "date", "startTime");

-- FK: appointments.patientId -> users.id
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- FK: appointments.dentistId -> dentists.id
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_dentistId_fkey"
    FOREIGN KEY ("dentistId") REFERENCES "dentists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- TABLA: clinical_records
-- ============================================================

CREATE TABLE "clinical_records" (
    "id"            TEXT NOT NULL DEFAULT gen_random_uuid(),
    "patientId"     TEXT NOT NULL,
    "dentistId"     TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "notes"         TEXT NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_records_pkey" PRIMARY KEY ("id")
);

-- Unique: appointmentId
CREATE UNIQUE INDEX "clinical_records_appointmentId_key" ON "clinical_records"("appointmentId");

-- FK: clinical_records.patientId -> users.id
ALTER TABLE "clinical_records" ADD CONSTRAINT "clinical_records_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- FK: clinical_records.dentistId -> dentists.id
ALTER TABLE "clinical_records" ADD CONSTRAINT "clinical_records_dentistId_fkey"
    FOREIGN KEY ("dentistId") REFERENCES "dentists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- FK: clinical_records.appointmentId -> appointments.id
ALTER TABLE "clinical_records" ADD CONSTRAINT "clinical_records_appointmentId_fkey"
    FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- TABLA: audit_logs
-- ============================================================

CREATE TABLE "audit_logs" (
    "id"           TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId"       TEXT NOT NULL,
    "action"       TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId"   TEXT NOT NULL,
    "details"      TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- Index: userId
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- Index: (resourceType, resourceId)
CREATE INDEX "audit_logs_resourceType_resourceId_idx" ON "audit_logs"("resourceType", "resourceId");

-- FK: audit_logs.userId -> users.id
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- TABLA: clinic
-- ============================================================

CREATE TABLE "clinic" (
    "id"           TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name"         TEXT NOT NULL,
    "address"      TEXT,
    "phone"        TEXT,
    "generalHours" TEXT,
    "email"        TEXT,
    "rut"          TEXT,
    "website"      TEXT,
    "logoUrl"      TEXT,

    CONSTRAINT "clinic_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- TABLA: dental_units
-- ============================================================

CREATE TABLE "dental_units" (
    "id"          TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name"        TEXT NOT NULL,
    "type"        "DentalUnitType" NOT NULL,
    "status"      "DentalUnitStatus" NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dental_units_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- TABLA: email_templates
-- ============================================================

CREATE TABLE "email_templates" (
    "id"        TEXT NOT NULL DEFAULT gen_random_uuid(),
    "key"       TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "subject"   TEXT NOT NULL,
    "body"      TEXT NOT NULL,
    "isActive"  BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- Unique: key
CREATE UNIQUE INDEX "email_templates_key_key" ON "email_templates"("key");

-- ============================================================
-- TABLA: system_settings
-- ============================================================

CREATE TABLE "system_settings" (
    "id"    TEXT NOT NULL DEFAULT gen_random_uuid(),
    "key"   TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type"  "SettingType" NOT NULL DEFAULT 'NUMBER',

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- Unique: key
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- ============================================================
-- TABLA: refresh_tokens
-- ============================================================

CREATE TABLE "refresh_tokens" (
    "id"              TEXT NOT NULL DEFAULT gen_random_uuid(),
    "jti"             TEXT NOT NULL,
    "tokenHash"       TEXT NOT NULL,
    "userId"          TEXT NOT NULL,
    "deviceInfo"      TEXT,
    "expiresAt"       TIMESTAMP(3) NOT NULL,
    "revokedAt"       TIMESTAMP(3),
    "replacedByToken" TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- Unique: jti
CREATE UNIQUE INDEX "refresh_tokens_jti_key" ON "refresh_tokens"("jti");

-- Unique: tokenHash
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- Index: userId
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- Index: tokenHash (para busqueda rapida)
CREATE INDEX "refresh_tokens_tokenHash_idx" ON "refresh_tokens"("tokenHash");

-- FK: refresh_tokens.userId -> users.id (CASCADE para limpiar tokens al borrar usuario)
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- DATOS INICIALES (Seed)
-- ============================================================

-- Clinica por defecto
INSERT INTO "clinic" ("id", "name", "address", "phone", "generalHours", "email", "rut", "website")
VALUES (
    gen_random_uuid(),
    'BIODENTIS Centro Odontologico Especializado',
    'César de los Ríos 276, Los Olivos 15304',
    '954917425',
    'Lunes a Viernes 08:30 - 19:30 | Sabados 09:00 - 14:00',
    'contacto@biodentis.cl',
    '76.892.410-K',
    'https://biodentis.cl'
);

-- Usuarios de prueba (contrasenas hasheadas con bcrypt)
-- Admin: admin@biodentis.com / Admin123!
-- Recepcion: recepcion@biodentis.com / Recepcion123!
-- Odontologo: dr.martinez@biodentis.com / Doctor123!
-- Paciente: paciente@biodentis.com / Paciente123!

INSERT INTO "users" ("id", "email", "passwordHash", "role", "firstName", "lastName", "phone")
VALUES
    (gen_random_uuid(), 'admin@biodentis.com', '$2b$10$placeholder_hash_admin', 'ADMIN', 'Admin', 'Sistema', NULL),
    (gen_random_uuid(), 'recepcion@biodentis.com', '$2b$10$placeholder_hash_recepcion', 'RECEPTIONIST', 'Andrea', 'Valenzuela', '+56 9 1234 5678'),
    (gen_random_uuid(), 'dr.martinez@biodentis.com', '$2b$10$placeholder_hash_dentist', 'DENTIST', 'Carlos', 'Martinez', '+56 9 8765 4321'),
    (gen_random_uuid(), 'paciente@biodentis.com', '$2b$10$placeholder_hash_paciente', 'PATIENT', 'Maria', 'Garcia', '+56 9 1111 2222');

-- Unidades dentales por defecto
INSERT INTO "dental_units" ("id", "name", "type", "status", "description")
VALUES
    (gen_random_uuid(), 'Sillon 1', 'SILLON', 'ACTIVE', 'Sillon odontologico principal'),
    (gen_random_uuid(), 'Sillon 2', 'SILLON', 'ACTIVE', 'Sillon odontologico secundario'),
    (gen_random_uuid(), 'Sillon 3', 'SILLON', 'ACTIVE', 'Sillon de enfants'),
    (gen_random_uuid(), 'Sillon 4', 'SILLON', 'ACTIVE', 'Sillon de cirugia menor'),
    (gen_random_uuid(), 'Sillon 5', 'SILLON', 'ACTIVE', 'Sillon de implantes'),
    (gen_random_uuid(), 'Sillon 6', 'SILLON', 'ACTIVE', 'Sillon de endodoncia'),
    (gen_random_uuid(), 'Box Quirurgico 1', 'QUIRURGICO', 'ACTIVE', 'Pabellon de cirugia maxilofacial'),
    (gen_random_uuid(), 'Sala Radiologica', 'RADIOLOGICO', 'ACTIVE', 'Equipo Panoramico 3D Cone Beam CBCT');

-- Plantillas de correo por defecto
INSERT INTO "email_templates" ("id", "key", "name", "subject", "body", "isActive")
VALUES
    (gen_random_uuid(), 'registro_cita', 'Registro de Cita', 'Confirmacion de su cita en BIODENTIS',
     'Estimado(a) {nombre_paciente},

Su cita odontologica ha sido registrada exitosamente.

Fecha: {fecha}
Hora: {hora}
Odontologo: {odontologo}
Direccion: {direccion_clinica}

Por favor presentarse 10 minutos antes.

Atentamente,
Equipo BIODENTIS', true),

    (gen_random_uuid(), 'recordatorio', 'Recordatorio de Cita', 'Recordatorio de su proxima cita dental en BIODENTIS',
     'Estimado(a) {nombre_paciente},

Le recordamos su cita odontologica agendada para el {fecha} a las {hora} hrs en {direccion_clinica}, con el Dr./Dra. {odontologo}.

Favor presentarse 10 minutos antes. Si requiere cancelar o reprogramar, por favor responda a este mensaje.

Atentamente,
Equipo BIODENTIS', true),

    (gen_random_uuid(), 'cancelacion', 'Cancelacion de Cita', 'Cancelacion de su cita en BIODENTIS',
     'Estimado(a) {nombre_paciente},

Su cita odontologica programada para el {fecha} a las {hora} ha sido cancelada.

Si desea reprogramar, por favor contactenos.

Atentamente,
Equipo BIODENTIS', true);

-- Configuracion del sistema por defecto
INSERT INTO "system_settings" ("id", "key", "value", "type")
VALUES
    (gen_random_uuid(), 'password_min_length', '8', 'NUMBER'),
    (gen_random_uuid(), 'password_require_uppercase', 'true', 'BOOLEAN'),
    (gen_random_uuid(), 'password_require_numbers', 'true', 'BOOLEAN'),
    (gen_random_uuid(), 'password_require_special', 'true', 'BOOLEAN'),
    (gen_random_uuid(), 'jwt_access_minutes', '15', 'NUMBER'),
    (gen_random_uuid(), 'jwt_refresh_days', '7', 'NUMBER'),
    (gen_random_uuid(), 'reminder_hours_before', '3', 'NUMBER'),
    (gen_random_uuid(), 'reminder_channels', 'email,whatsapp', 'STRING');

-- ============================================================
-- FIN DEL SCHEMA
-- ============================================================
