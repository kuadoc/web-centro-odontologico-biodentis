-- Cambio aditivo: los pacientes existentes conservan DNI NULL hasta registrarlo.
-- Aplicar antes de iniciar la aplicación con el cliente Prisma actualizado.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "dni" VARCHAR(8);
